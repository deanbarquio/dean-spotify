/**
 * The overworld: a moonlit labyrinth valley under drifting mist, a glowing
 * beacon per place. Fixed, angled camera: drag (or one finger) pans across the
 * ground, wheel / pinch zooms, clicking a beacon picks it. HTML markers are
 * pinned to beacons by projecting their anchor every frame. Post stack:
 * bloom → tone map → lens pass (chromatic fringe, vignette, film grain).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { PLACES } from './places';
import { buildTerrain } from './terrain';
import { buildBeacons } from './beacons';
import { buildTrees, buildMist } from './nature';
import { buildWater } from './water';
import { buildStorm, buildBirds } from './sky';
import { buildGuardian, ORB_LIFT } from './phoenix';

export type World = {
  enter: () => void;
  focus: (id: string, image?: string) => void;
  setDive: (p: number) => void;
  overview: () => void;
  release: () => void;
  nudge: (right: number, forward: number) => void;
  zoom: (factor: number) => void;
  setHover: (id: string | null) => void;
  destroy: () => void;
};

type Opts = {
  reducedMotion: boolean;
  markers: Map<string, HTMLElement>;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  onMove?: (x: number, z: number, dist: number) => void;
  onThunder?: (strength: number, delay: number) => void;
};

const YAW = 0.18;
// Low, across-the-valley angle: maze fills the lower two thirds, misty ridgeline and sky above
const PITCH = 0.4;
const LOOK_Y = 2;
const MIN_DIST = 40;
const MAX_DIST = 240;
const BOUND = 75;
const FOV = 42;
/** Palette from the reference: dark zenith → haze at the horizon; fog sits between so distance dissolves into it */
const SKY_TOP = '#0b1526';
const HAZE = '#2a4568';
// Fog darker than the haze: distance sinks into night instead of washing out white
const FOG = '#203a5c';

const lensShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
    float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float d = dot(c, c);
      // Chromatic fringe grows toward the edges
      vec2 off = c * d * 0.02;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      // Film grade: pull saturation down and lean the mids toward teal, as in the reference
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 0.78);
      col *= vec3(0.93, 1.02, 1.04);
      col = mix(vec3(0.015, 0.025, 0.05), vec3(1.0), col); // blue-black shadows, only slightly lifted
      col = col * col * (3.0 - 2.0 * col) * 0.35 + col * 0.65; // gentle S-curve: more contrast, less milk
      col *= mix(1.0, 0.4, smoothstep(0.1, 0.5, d));
      // Colour grain: per-channel noise reads like film rather than digital static
      vec2 gp = vUv * uRes + fract(uTime * 7.0) * 91.0;
      col += (vec3(rand(gp), rand(gp + 17.0), rand(gp + 41.0)) - 0.5) * 0.075;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  // The background spans the screen and the camera looks down, so the ridgeline sits near the top:
  // keep the upper sky a lit haze (dark only at the very edge) so peaks dissolve into mist
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(0.25, '#13233e');
  grad.addColorStop(0.7, HAZE);
  grad.addColorStop(1, '#33557f');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWorld(canvas: HTMLCanvasElement, opts: Opts): World {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  // Thin enough that the maze keeps its contrast; the far rim and mountains still dissolve
  const fog = new THREE.FogExp2(FOG, 0.0042);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 1200);

  /* Moonlight from behind the maze so crests get a cold rim toward the viewer */
  // Fill tuned so lit rock lands on the labyrinth palette (#1d4f79 → #3573a5) after grading
  const hemi = new THREE.HemisphereLight('#6a9ad0', '#142c47', 1.5);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight('#b8cff0', 2.2);
  moon.position.set(-70, 110, -140);
  moon.castShadow = true;
  moon.shadow.mapSize.setScalar(2048);
  Object.assign(moon.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 20, far: 420 });
  moon.shadow.bias = -0.0005;
  moon.shadow.normalBias = 0.6;
  scene.add(moon);

  const terrain = buildTerrain(small ? 220 : 380);
  const mist = buildMist();
  const lights = buildBeacons(PLACES, fog);
  const water = buildWater({
    beacons: lights.beacons.map((b) => ({ pos: b.anchor, color: b.light.color })),
    moonDir: moon.position,
    fog,
    sky: { top: SKY_TOP, horizon: HAZE },
  });
  const birds = buildBirds();
  const storm = buildStorm({ scene, hemi, fog, onThunder: opts.onThunder });
  scene.add(terrain.group, water.mesh, buildTrees(), lights.group, mist.group, birds.group);
  const guardian = buildGuardian(scene, { reducedMotion: opts.reducedMotion, renderer, camera });

  /* Pick proxies: generous invisible spheres around each beacon */
  const proxyGeo = new THREE.SphereGeometry(5, 8, 6);
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const proxies = lights.beacons.map((b) => {
    const m = new THREE.Mesh(proxyGeo, proxyMat);
    m.position.set(b.anchor.x, b.base + 2.5, b.anchor.z);
    m.userData.id = b.id;
    scene.add(m);
    return m;
  });
  const markers = lights.beacons.map((b) => opts.markers.get(b.id));

  /* Post */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.7, 0.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const lens = new ShaderPass(lensShader);
  composer.addPass(lens);

  /* Camera rig: `cur` is what's on screen, `want` is where it's easing to */
  let w = 1;
  let h = 1;
  const overviewDist = () => THREE.MathUtils.clamp(140 / Math.sqrt(Math.min(w / h, 1.8) / 1.8), 140, 230);
  // y = look-at height: ground level normally, raised to the orb when a place is focused
  const cur = { x: 0, y: LOOK_Y, z: -18, dist: 320, yaw: YAW + 1.2, pitch: 1.0 };
  const want = { ...cur };
  let entered = false;

  const applyCamera = () => {
    const cp = Math.cos(cur.pitch);
    camera.position.set(cur.x + Math.sin(cur.yaw) * cp * cur.dist, cur.y + Math.sin(cur.pitch) * cur.dist, cur.z + Math.cos(cur.yaw) * cp * cur.dist);
    camera.lookAt(cur.x, cur.y, cur.z);
    // The camera isn't in the scene graph: refresh its matrices now so marker projection matches this frame
    camera.updateMatrixWorld();
  };
  const clampTarget = (o: { x: number; z: number }) => {
    const r = Math.hypot(o.x, o.z);
    if (r > BOUND) {
      o.x *= BOUND / r;
      o.z *= BOUND / r;
    }
  };

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    const dpr = Math.min(small ? 1.5 : 1.75, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    lens.uniforms.uRes.value.set(w * dpr, h * dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    lights.setScale(((h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)))) * 0.16);
  };

  /* Pointer: grab-the-ground panning, pinch zoom, click to pick */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LOOK_Y);
  const hitPoint = new THREE.Vector3();
  const aim = (x: number, y: number) => {
    ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const ground = (x: number, y: number) => {
    aim(x, y);
    return ray.ray.intersectPlane(plane, hitPoint) ? { x: hitPoint.x, z: hitPoint.z } : null;
  };
  const pick = (x: number, y: number) => {
    aim(x, y);
    return (ray.intersectObjects(proxies, false)[0]?.object.userData.id as string | undefined) ?? null;
  };

  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { sx: number; sy: number; t: number; moved: number; last: { x: number; z: number } | null } | null = null;
  let pinch: { span: number; dist: number } | null = null;
  const vel = { x: 0, z: 0 };
  let hoverId: string | null = null;
  let focusId: string | null = null;

  const span = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onDown = (e: PointerEvent) => {
    if (!entered) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = { sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0, last: ground(e.clientX, e.clientY) };
      vel.x = vel.z = 0;
    } else if (pointers.size === 2) {
      drag = null;
      pinch = { span: span(), dist: want.dist };
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!entered) return;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      want.dist = THREE.MathUtils.clamp((pinch.dist * pinch.span) / Math.max(span(), 1), MIN_DIST, MAX_DIST);
      return;
    }
    if (drag) {
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
      const g = ground(e.clientX, e.clientY);
      if (g && drag.last) {
        // Shift the camera so the grabbed ground point stays under the pointer
        const dx = drag.last.x - g.x;
        const dz = drag.last.z - g.z;
        cur.x += dx;
        cur.z += dz;
        clampTarget(cur);
        want.x = cur.x;
        want.z = cur.z;
        vel.x = dx * 60;
        vel.z = dz * 60;
        applyCamera();
        drag.last = ground(e.clientX, e.clientY);
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      const id = pick(e.clientX, e.clientY);
      if (id !== hoverId) {
        hoverId = id;
        canvas.style.cursor = id ? 'pointer' : '';
        opts.onHover(id);
      }
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && pointers.size === 0) {
      if (drag.moved < 6 && performance.now() - drag.t < 450) {
        vel.x = vel.z = 0;
        const id = pick(e.clientX, e.clientY);
        if (id) opts.onPick(id);
      }
      drag = null;
    }
  };
  const onWheel = (e: WheelEvent) => {
    if (!entered) return;
    e.preventDefault();
    // While a place is focused the wheel drives the portal dive (handled by the page), not zoom
    if (focusId) return;
    want.dist = THREE.MathUtils.clamp(want.dist * Math.exp(e.deltaY * 0.0012), MIN_DIST, MAX_DIST);
  };

  /* Frame */
  const v = new THREE.Vector3();
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let running = true;
  const frame = (now: number) => {
    raf = running ? requestAnimationFrame(frame) : 0;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    time += dt;
    const anim = opts.reducedMotion ? 0 : time;

    if (!entered && !opts.reducedMotion) want.yaw += dt * 0.05;
    // Glide after a flick
    if (!drag && (vel.x || vel.z)) {
      const decay = Math.exp(-dt * 4);
      vel.x *= decay;
      vel.z *= decay;
      want.x += vel.x * dt;
      want.z += vel.z * dt;
      clampTarget(want);
      if (Math.hypot(vel.x, vel.z) < 0.05) vel.x = vel.z = 0;
    }
    const k = 1 - Math.exp(-dt * (opts.reducedMotion ? 14 : entered ? 2.6 : 1.2));
    cur.x += (want.x - cur.x) * k;
    cur.y += (want.y - cur.y) * k;
    cur.z += (want.z - cur.z) * k;
    cur.dist += (want.dist - cur.dist) * k;
    cur.yaw += (want.yaw - cur.yaw) * k;
    cur.pitch += (want.pitch - cur.pitch) * k;
    applyCamera();

    terrain.tick(anim);
    water.tick(anim);
    birds.tick(anim);
    // Lightning is skipped entirely for reduced motion (no flashing)
    if (!opts.reducedMotion) storm.tick(time);
    if (!opts.reducedMotion) mist.tick(dt);
    lights.beacons.forEach((b, i) => {
      const target = b.id === hoverId || b.id === focusId ? 1 : 0;
      b.hover += (target - b.hover) * (1 - Math.exp(-dt * 8));
      const el = markers[i];
      if (!el) return;
      v.copy(b.anchor).project(camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2;
      el.classList.toggle('is-off', off || !entered);
      if (!off) el.style.transform = `translate3d(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px, 0)`;
    });
    lights.tick(anim, camera);
    guardian.tick(anim, dt);
    lens.uniforms.uTime.value = time;
    opts.onMove?.(cur.x, cur.z, cur.dist);
    composer.render(dt);
  };

  const onVisibility = () => {
    running = !document.hidden;
    if (running && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  resize();
  applyCamera();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(frame);

  /** Portal dive: 0 = orb framed from across the channel, 1 = camera just inside the orb, facing the picture */
  let focusBase = 0;
  const setDive = (p: number) => {
    if (!focusId) return;
    const e = p * p * (3 - 2 * p);
    const start = w < 700 ? 95 : 72;
    want.y = focusBase + THREE.MathUtils.lerp(9, ORB_LIFT, e);
    want.dist = THREE.MathUtils.lerp(start, 5.5, e);
    want.pitch = THREE.MathUtils.lerp(0.3, 0.04, e);
    guardian.setDive(p);
  };

  const home = () => {
    // Aim a little past the centre so the maze sits low in frame under the headline
    want.x = 0;
    want.y = LOOK_Y;
    want.z = -10;
    want.dist = overviewDist();
    want.pitch = PITCH;
  };

  return {
    enter() {
      entered = true;
      // Unwind the idle drift the short way round, then descend to the overview
      want.yaw = YAW + Math.round((cur.yaw - YAW) / (Math.PI * 2)) * Math.PI * 2;
      home();
    },
    /** Frame a place: beam and orb centred, beacon low in frame, caption below */
    focus(id, image) {
      const b = lights.beacons.find((k) => k.id === id);
      if (!b) return;
      focusId = id;
      focusBase = b.base;
      vel.x = vel.z = 0;
      want.x = b.anchor.x;
      want.z = b.anchor.z;
      want.yaw = YAW;
      guardian.focus(new THREE.Vector3(b.anchor.x, b.base, b.anchor.z), b.light.color, image);
      setDive(0);
    },
    setDive,
    overview() {
      focusId = null;
      vel.x = vel.z = 0;
      guardian.focus(null);
      guardian.setDive(0);
      home();
    },
    release() {
      focusId = null;
      guardian.focus(null);
      guardian.setDive(0);
      want.y = LOOK_Y;
      want.dist = Math.max(want.dist, 110);
      want.pitch = PITCH;
    },
    nudge(right, forward) {
      const s = want.dist * 0.08;
      const sy = Math.sin(YAW);
      const cy = Math.cos(YAW);
      want.x += (cy * right - sy * forward) * s;
      want.z += (-sy * right - cy * forward) * s;
      clampTarget(want);
    },
    zoom(f) {
      want.dist = THREE.MathUtils.clamp(want.dist * f, MIN_DIST, MAX_DIST);
    },
    setHover(id) {
      hoverId = id;
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      document.removeEventListener('visibilitychange', onVisibility);
      composer.dispose();
      renderer.dispose();
    },
  };
}
