/**
 * The island's guardian and the focus effect.
 * - Orb: when a place is opened, a beam climbs from its beacon into a large,
 *   swirling sphere of light in the beacon's colour (fresnel rim, churning
 *   fbm core, sparks orbiting inside).
 * - Phoenix: the skinned phoenix model, set alight (emissive, own light),
 *   flapping through its baked clip. It patrols low over the labyrinth; when a
 *   place is opened it swoops in and circles that orb, then returns to patrol.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { heightAt, noiseGlsl } from './terrain';

export const ORB_R = 7;
export const ORB_LIFT = 13; // orb centre above the beacon

/* ───────── Orb ───────── */
const orbVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vP = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const orbFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime, uShow;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
${noiseGlsl}
void main() {
  float facing = max(dot(normalize(vN), normalize(vV)), 0.0);
  float rim = pow(1.0 - facing, 2.2);
  // Swirl: latitude bands twisted by time and noise, like a storm seen through glass
  vec3 p = normalize(vP);
  float ang = atan(p.z, p.x) + p.y * 2.4 + uTime * 0.35;
  vec2 q = vec2(ang * 1.6, p.y * 3.0 - uTime * 0.2);
  float swirl = fbm(q + fbm3(q * 1.8 + uTime * 0.15) * 1.3);
  float core = smoothstep(0.35, 0.85, swirl) * (0.35 + facing * 0.65);
  vec3 hot = mix(uColor, vec3(1.0, 0.97, 0.88), 0.45);
  vec3 col = uColor * (0.35 + core * 1.6) + hot * pow(core, 3.0) * 1.4 + uColor * rim * 2.2;
  float a = (0.28 + core * 0.55 + rim * 0.9) * uShow;
  gl_FragColor = vec4(col * a, a);
}`;
const beamFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime, uShow;
varying vec2 vUv;
${noiseGlsl}
void main() {
  float x = abs(vUv.x - 0.5) * 2.0;
  float flick = 0.75 + 0.25 * noise(vec2(vUv.y * 8.0 - uTime * 3.0, 0.0));
  float a = smoothstep(1.0, 0.0, x) * flick * smoothstep(0.0, 0.15, vUv.y) * uShow * 0.9;
  vec3 col = mix(uColor, vec3(1.0), smoothstep(0.6, 0.0, x) * 0.6) * 1.6;
  gl_FragColor = vec4(col * a, a);
}`;
const beamVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** Portal: the project image seen through the orb, twisted into a vortex that unwinds as the visitor dives in */
const portalFrag = /* glsl */ `
uniform sampler2D tMap;
uniform vec3 uColor;
uniform float uTime, uShow, uDive, uHas, uAspect;
varying vec2 vUv;
${noiseGlsl}
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float edge = 0.86 + (noise(vec2(atan(c.y, c.x) * 3.0, uTime * 0.6)) - 0.5) * 0.12;
  float mask = smoothstep(edge, edge - 0.18, r);
  if (mask <= 0.0) discard;
  // Vortex: rotate by an amount that grows toward the centre, relaxed by the dive
  float twist = (1.0 - uDive) * (2.6 * (1.0 - r) + sin(uTime * 0.7) * 0.2) + uTime * 0.08 * (1.0 - uDive);
  vec2 rc = mat2(cos(twist), -sin(twist), sin(twist), cos(twist)) * c;
  // Cover-fit the image in the disc
  vec2 uv = rc * vec2(1.0, uAspect) * (0.9 - uDive * 0.15) + 0.5;
  vec3 img = texture2D(tMap, clamp(uv, 0.0, 1.0)).rgb;
  // Tinted and dim inside the orb; true colour once through
  vec3 col = mix(mix(img, img * uColor * 1.8, 0.55) * 0.7, img, smoothstep(0.35, 1.0, uDive));
  col += uColor * pow(r, 3.0) * (1.0 - uDive) * 0.8;
  float a = mask * uShow * uHas * mix(0.55, 1.0, uDive);
  gl_FragColor = vec4(col, a);
}`;

function buildOrb() {
  const group = new THREE.Group();
  const color = new THREE.Color();
  const shared = { uColor: { value: color }, uTime: { value: 0 }, uShow: { value: 0 } };
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(ORB_R, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: orbVert,
      fragmentShader: orbFrag,
      uniforms: shared,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  shell.position.y = ORB_LIFT;
  shell.renderOrder = 4;
  const beam = new THREE.Mesh(
    // From the crystal up to the orb's underside, so it feeds the orb rather than skewering it
    new THREE.PlaneGeometry(1.4, ORB_LIFT - ORB_R * 0.8).translate(0, (ORB_LIFT - ORB_R * 0.8) / 2 + 1, 0),
    new THREE.ShaderMaterial({
      vertexShader: beamVert,
      fragmentShader: beamFrag,
      uniforms: shared,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  beam.renderOrder = 4;
  const light = new THREE.PointLight(color, 0, 60, 1.4);
  light.position.y = ORB_LIFT;
  const portalU = {
    tMap: { value: null as THREE.Texture | null },
    uColor: shared.uColor,
    uTime: shared.uTime,
    uShow: shared.uShow,
    uDive: { value: 0 },
    uHas: { value: 0 },
    uAspect: { value: 1 },
  };
  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(ORB_R * 2, ORB_R * 2),
    new THREE.ShaderMaterial({ vertexShader: beamVert, fragmentShader: portalFrag, uniforms: portalU, transparent: true, depthWrite: false })
  );
  portal.position.y = ORB_LIFT;
  // Drawn before the additive shell so the glow sits over the picture
  portal.renderOrder = 3;
  // The light is not a child of the (often hidden) group: lights under an invisible parent don't
  // count, so showing the orb would change the light count and recompile every material in the scene
  group.add(shell, beam, portal);
  group.visible = false;
  return { group, shell, beam, light, portal, portalU, color, u: shared };
}

/* ───────── Fire whirl: the vortex the phoenix whips up around a hovered beacon ───────── */
const WHIRL_H = 16;
const EMBERS = 380;
/**
 * Embers riding a helix: each one climbs on its own clock, the spiral tightening near the crystal
 * and loosening as it rises, swirling faster down low. White-hot at the source, cooling to orange,
 * then to the beacon's colour before it burns out.
 */
const emberVert = /* glsl */ `
attribute float aSeed;
uniform float uTime, uShow, uScale;
varying vec3 vColor;
varying float vA;
uniform vec3 uColor;
void main() {
  float s1 = fract(aSeed * 13.17), s2 = fract(aSeed * 71.3), s3 = fract(aSeed * 5.91);
  float h = fract(uTime * (0.32 + s1 * 0.3) + aSeed);
  float y = h * ${WHIRL_H.toFixed(1)} * (0.75 + s2 * 0.35);
  // Tight at the base, opening out; a few strays fly wide
  float r = mix(0.8, 6.0, pow(h, 0.75)) * (0.7 + s3 * 0.6) + step(0.93, s2) * h * 4.0;
  float ang = aSeed * 6.2831853 * 7.0 + uTime * (5.5 - h * 3.0) + h * 5.0;
  vec3 p = vec3(cos(ang) * r, y + sin(uTime * 3.0 + aSeed * 40.0) * 0.4, sin(ang) * r);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = (0.18 + s3 * 0.32) * (1.25 - h * 0.7);
  gl_PointSize = size * uScale / -mv.z * uShow;
  vec3 hot = vec3(1.0, 0.9, 0.62);
  vec3 fire = vec3(1.0, 0.42, 0.08);
  vColor = mix(mix(hot, fire, smoothstep(0.0, 0.35, h)), uColor, smoothstep(0.45, 0.95, h));
  // Flicker out and in as they climb
  float flick = 0.65 + 0.35 * sin(uTime * 17.0 + aSeed * 90.0);
  vA = smoothstep(0.0, 0.08, h) * (1.0 - smoothstep(0.6, 1.0, h)) * flick * uShow;
}`;
const emberFrag = /* glsl */ `
varying vec3 vColor;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  a *= a * vA;
  gl_FragColor = vec4(vColor * 1.25 * a, a);
}`;
/** Shockwaves rolling out across the ground from the crystal */
const shockFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime, uShow;
varying vec2 vUv;
${noiseGlsl}
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  if (r > 1.0) discard;
  // Ragged flame edge, shared by every wave (one noise lookup per pixel)
  float rag = (noise(vec2(atan(c.y, c.x) * 4.0, uTime * 2.0)) - 0.5) * 0.08;
  float a = 0.0;
  for (int i = 0; i < 3; i++) {
    float ph = fract(uTime * 0.9 + float(i) / 3.0);
    a += smoothstep(0.07, 0.0, abs(r - ph - rag)) * (1.0 - ph) * (1.0 - ph);
  }
  a *= smoothstep(1.0, 0.85, r) * uShow * 0.55;
  vec3 col = mix(vec3(1.0, 0.5, 0.12), uColor, 0.4) * 1.4;
  gl_FragColor = vec4(col * a, a);
}`;
const shockVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function buildWhirl() {
  const u = { uColor: { value: new THREE.Color() }, uTime: { value: 0 }, uShow: { value: 0 }, uScale: { value: 300 } };
  const group = new THREE.Group();
  const seeds = new Float32Array(EMBERS);
  for (let i = 0; i < EMBERS; i++) seeds[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  // Positions come from the shader; a placeholder attribute keeps three happy
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EMBERS * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const embers = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({ vertexShader: emberVert, fragmentShader: emberFrag, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  embers.frustumCulled = false;
  embers.renderOrder = 4;
  const shock = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24).rotateX(-Math.PI / 2).translate(0, 0.3, 0),
    new THREE.ShaderMaterial({ vertexShader: shockVert, fragmentShader: shockFrag, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  shock.renderOrder = 4;
  group.add(shock, embers);
  group.visible = false;
  return { group, u };
}

/* ───────── Phoenix ───────── */
type Bird = { model: THREE.Group; mixer: THREE.AnimationMixer };

/** Camera layer the bird lives on: drawn in its own pass after the scene, so nothing (water, walls, mist) ever covers it */
export const PHOENIX_LAYER = 1;

async function loadPhoenix(url: string): Promise<Bird> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  // The model's head points down +x: turn it so it flies along +z (what lookAt aims)
  model.rotation.y = -Math.PI / 2;
  const fire = new THREE.Color('#ff8a2a');
  model.traverse((o) => {
    o.layers.set(PHOENIX_LAYER);
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = false; // skinned bounds don't follow the flapping wings
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
    mats.forEach((mat) => {
      if (!('emissive' in mat)) return;
      // Set alight: keep its own texture, but glow from within in ember orange
      mat.emissive = fire;
      mat.emissiveIntensity = 1.6;
      if (mat.map) mat.emissiveMap = mat.map;
    });
  });
  // Normalise to a ~9 unit wingspan whatever the source units
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.setScalar(9 / Math.max(size.x, size.z, 1e-3));
  const mixer = new THREE.AnimationMixer(model);
  const clip = gltf.animations[0];
  if (clip) mixer.clipAction(clip).play();
  return { model, mixer };
}

type GuardianOpts = {
  reducedMotion: boolean;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  /** One render through the real (post-processed) pipeline, so shaders compile in the right variant */
  warm: () => void;
};

/** Intro flight: from far out in the mist beyond the labyrinth, sweeping in to join its patrol */
const INTRO_FROM = new THREE.Vector3(-34, 74, -150);
const INTRO_VIA = new THREE.Vector3(22, 58, -85);
/** Provoked: windup, lunge, recover */
const PROVOKE = 1.8;
const lungeCurve = (k: number) => Math.pow(Math.sin(Math.PI * k), 1.5) - 0.18 * Math.sin(2 * Math.PI * Math.min(k * 2, 1));

export function buildGuardian(scene: THREE.Scene, { reducedMotion, renderer, camera, warm }: GuardianOpts) {
  const orb = buildOrb();
  const whirl = buildWhirl();
  scene.add(orb.group, orb.light, whirl.group);
  const drawSize = new THREE.Vector2();
  // Root and its fire light join the scene up front: the light count never changes later,
  // so no material in the scene has to recompile when the model arrives
  const root = new THREE.Group();
  const fireLight = new THREE.PointLight('#ff9a40', 0, 40, 1.6);
  root.add(fireLight);
  // Pick volume for the visitor's clicks
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.userData.phoenix = true;
  root.add(proxy);
  scene.add(root);

  let bird: Bird | null = null;
  let headBone: THREE.Object3D | null = null;
  let tailBone: THREE.Object3D | null = null;
  const glows: THREE.MeshStandardMaterial[] = [];
  loadPhoenix('/phoenix_bird.glb')
    .then((b) => {
      b.model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) ([] as THREE.Material[]).concat(m.material).forEach((mt) => 'emissive' in mt && glows.push(mt as THREE.MeshStandardMaterial));
      });
      root.add(b.model);
      // Bones the intro camera frames: the head, and the far end of the tail plumes
      b.model.traverse((o) => {
        if (!(o as THREE.Bone).isBone) return;
        if (!headBone && /head/i.test(o.name)) headBone = o;
        if (/tail_5/i.test(o.name)) tailBone = o;
      });
      // Compile in the variant actually used, before it flies into view
      warm();
      bird = b;
    })
    .catch((err) => console.warn('Phoenix failed to load', err));

  // Intro flight and provocation
  let intro: { t: number; dur: number } | null = null;
  let provoked = 0; // seconds into the provocation (0 = calm)
  const lungeAt = new THREE.Vector3();
  let hoverGlow = 0;
  let hoverWant = 0;

  let target: THREE.Vector3 | null = null; // focused beacon base
  let rally: THREE.Vector3 | null = null; // hovered beacon base: circle it fast, whipping up the whirl
  let rallyGlow = 0;
  let dive = 0;
  let portalImage: string | null = null;
  // ImageBitmapLoader decodes off the main thread (TextureLoader decodes on it, stalling a frame)
  const loader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: 'flipY' });
  const textures = new Map<string, Promise<THREE.Texture>>();
  const texture = (url: string) => {
    let p = textures.get(url);
    if (!p) {
      p = loader.loadAsync(url).then((bitmap) => {
        const tex = new THREE.Texture(bitmap as ImageBitmap);
        tex.flipY = false; // already flipped during decode
        tex.needsUpdate = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        // Upload now so the first portal frame doesn't stall on it
        renderer.initTexture(tex);
        return tex;
      });
      textures.set(url, p);
    }
    return p;
  };
  let show = 0;
  const pos = new THREE.Vector3(0, 32, -6);
  const want = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const prev = new THREE.Vector3().copy(pos);
  const vel = new THREE.Vector3();
  const look = new THREE.Vector3();
  const bank = new THREE.Vector3();
  const push = new THREE.Vector3();
  const disp = new THREE.Vector3().copy(pos); // shown position
  const aim = new THREE.Object3D();
  let roll = 0;

  return {
    /** Point the orb (and the phoenix) at a beacon, or release with null; `image` fills the portal */
    focus(base: THREE.Vector3 | null, color?: THREE.Color, image?: string) {
      if (base) {
        target = base.clone();
        orb.group.position.copy(base);
        orb.light.position.copy(base).y += ORB_LIFT;
        if (color) orb.color.copy(color);
        const pu = orb.portalU;
        pu.uHas.value = 0;
        if (image) {
          const want = image;
          portalImage = want;
          texture(want).then((tex) => {
            if (portalImage !== want) return; // the visitor already moved on
            pu.tMap.value = tex;
            const img = tex.image as { width: number; height: number };
            pu.uAspect.value = img.width / Math.max(img.height, 1);
            pu.uHas.value = 1;
          });
        } else portalImage = null;
      } else {
        target = null;
        portalImage = null;
      }
    },
    /** 0 = orb seen from outside, 1 = through the portal */
    setDive(p: number) {
      dive = p;
    },
    /** Show the orb (fully transparent) for the world's warm-up render; returns the undo */
    prewarm() {
      orb.group.visible = true;
      whirl.group.visible = true;
      return () => {
        orb.group.visible = show > 0.01;
        whirl.group.visible = whirl.u.uShow.value > 0.01;
      };
    },
    /** A beacon is hovered: swoop down and circle it fast, unleashing a whirl of fire; null to let it go */
    rally(base: THREE.Vector3 | null, color?: THREE.Color) {
      rally = base ? base.clone() : null;
      if (base) {
        whirl.group.position.copy(base);
        if (color) whirl.u.uColor.value.copy(color);
      }
    },
    /** Where the phoenix is right now (the guardians track it) */
    birdPos: () => disp,
    /** Unit heading of the phoenix */
    birdDir: () => vel,
    hasBird: () => !!bird,
    /** World position of the head (falls back to the body) */
    headPos: (out: THREE.Vector3) => (headBone ? headBone.getWorldPosition(out) : out.copy(disp)),
    /** World position of the tail plumes' far end (falls back to the body) */
    tailPos: (out: THREE.Vector3) => (tailBone ? tailBone.getWorldPosition(out) : out.copy(disp)),
    proxy,
    /** Fly the intro path over `dur` seconds (from deep in the mist into the patrol) */
    startIntro(dur: number) {
      intro = { t: 0, dur };
      pos.copy(INTRO_FROM);
      disp.copy(INTRO_FROM);
      prev.copy(INTRO_FROM).add(new THREE.Vector3(0, 0, -1));
    },
    endIntro() {
      intro = null;
    },
    /** Visitor clicked it: rear, flare, then lunge at `at` and swing back */
    provoke(at: THREE.Vector3) {
      if (provoked > 0) return false;
      provoked = 1e-4;
      lungeAt.copy(at);
      return true;
    },
    setHover(on: boolean) {
      hoverWant = on ? 1 : 0;
    },
    /** A guardian's strike: knocks the phoenix off its line for a moment */
    shove(v: THREE.Vector3) {
      push.add(v);
    },
    tick(t: number, dt: number) {
      orb.portalU.uDive.value = dive;
      orb.portal.lookAt(camera.position);
      /* Orb fades in / out */
      show += ((target ? 1 : 0) - show) * (1 - Math.exp(-dt * 3));
      orb.group.visible = show > 0.01;
      orb.u.uShow.value = show;
      orb.u.uTime.value = t;
      orb.light.intensity = 260 * show;
      orb.shell.scale.setScalar(0.6 + show * 0.4);
      orb.shell.rotation.y = t * 0.15;
      /* Whirl: spins up once the phoenix has arrived, and dies down when it leaves */
      const rallying = !!rally && !target && !intro && !!bird;
      const whirlWant = rallying && pos.distanceTo(want) < 12 ? 1 : 0;
      whirl.u.uShow.value += (whirlWant - whirl.u.uShow.value) * (1 - Math.exp(-dt * (whirlWant ? 4 : 2.5)));
      whirl.u.uTime.value = t;
      whirl.group.visible = whirl.u.uShow.value > 0.01;
      // Ember size in world units → pixels: drawing-buffer height / (2 tan(fov / 2))
      if (whirl.group.visible) whirl.u.uScale.value = (renderer.getDrawingBufferSize(drawSize).y * camera.projectionMatrix.elements[5]) / 2;
      rallyGlow += ((rallying ? 1 : 0) - rallyGlow) * (1 - Math.exp(-dt * 4));

      if (!bird) return;
      bird.mixer.update(reducedMotion ? 0 : dt);
      /* Flight: patrol a wide figure-eight over the valley, or circle the orb */
      const at = (s: number, out: THREE.Vector3) => {
        if (target) {
          const a = s * 0.55;
          // Widens and climbs while the camera dives, so it never crosses the lens
          const r = 15 + dive * 14;
          return out.set(target.x + Math.cos(a) * r, target.y + ORB_LIFT + 3 + dive * 14 + Math.sin(s * 1.1) * 2, target.z + Math.sin(a) * r);
        }
        if (rally && !intro) {
          // Unleashing: a fast loop around the vortex, held clear of the walls (it's drawn over everything,
          // so a wing dipping into stone would paint across it)
          const a = s * 1.7;
          out.set(rally.x + Math.cos(a) * 11, 0, rally.z + Math.sin(a) * 11);
          return (out.y = Math.max(rally.y + 12 + Math.sin(s * 2.2) * 1.5, heightAt(out.x, out.z) + 7)), out;
        }
        // Guard duty: a lazy figure-eight kept inside the labyrinth's outer wall (r ≈ 72)
        const a = s * 0.11;
        return out.set(Math.sin(a) * 50, 32 + Math.sin(s * 0.3) * 5, Math.sin(a * 2) * 32 - 6);
      };
      at(t, want);
      if (intro) {
        // Scripted: a long curve from the mist into the patrol path, followed exactly (the camera chases it)
        intro.t = Math.min(intro.dur, intro.t + dt);
        const u = intro.t / intro.dur;
        const e = u * u * (3 - 2 * u);
        const k = 1 - e;
        pos.copy(INTRO_FROM).multiplyScalar(k * k).addScaledVector(INTRO_VIA, 2 * k * e).addScaledVector(want, e * e);
        if (intro.t >= intro.dur) intro = null;
      } else {
        // Ease toward the path so switching between patrol and orbit is a swoop, not a jump
        pos.lerp(want, 1 - Math.exp(-dt * (target ? 1.4 : rally ? 3.2 : 0.8)));
      }
      // Knock-back from the guardians, dying away over about a second
      pos.addScaledVector(push, dt);
      push.multiplyScalar(Math.exp(-dt * 2.5));
      at(t + 0.4, ahead);
      // Shown position = flight path + provocation offset (windup back, lunge at the target, swing home)
      disp.copy(pos);
      if (provoked > 0) {
        provoked += dt;
        const k = Math.min(1, provoked / PROVOKE);
        disp.addScaledVector(look.subVectors(lungeAt, pos), lungeCurve(k) * 0.85);
        if (k >= 1) provoked = 0;
      }
      root.position.copy(disp);
      vel.subVectors(disp, prev);
      prev.copy(disp);
      if (vel.lengthSq() > 1e-6) {
        vel.normalize();
        // Bank into turns, eased so a tight loop leans steadily instead of flicking side to side
        const turn = bank.copy(vel).cross(look.subVectors(ahead, disp).normalize()).y;
        roll += (THREE.MathUtils.clamp(-turn * 2, -0.6, 0.6) - roll) * (1 - Math.exp(-dt * 4));
        // Aim a stand-in, then turn the bird toward it: the heading follows smoothly rather than snapping each frame
        aim.position.copy(disp);
        aim.lookAt(look.copy(disp).add(vel).lerp(ahead, provoked > 0 ? 0 : 0.1));
        aim.rotateZ(roll);
        root.quaternion.slerp(aim.quaternion, intro ? 1 : 1 - Math.exp(-dt * 9));
      }
      // Fire: flares while provoked or hovered
      hoverGlow += (hoverWant - hoverGlow) * (1 - Math.exp(-dt * 8));
      const rage = provoked > 0 ? Math.sin(Math.PI * Math.min(1, provoked / PROVOKE)) : 0;
      let heat = 1 + rage * 2.5 + hoverGlow * 0.8 + rallyGlow * (0.5 + Math.sin(t * 11) * 0.15);
      let lightK = 1;
      if (intro) {
        // Ablaze from the first frame: a pulsing roar through the reveal, then a steady burn
        const u = intro.t / intro.dur;
        const roar = 1 - THREE.MathUtils.smoothstep(u, 0.2, 0.32);
        heat = 1 + roar * (0.45 + Math.sin(t * 6) * 0.15);
        // The feather dolly passes within a few metres: dim the light so the camera isn't sitting in its glow
        lightK = 1 - THREE.MathUtils.smoothstep(u, 0.22, 0.26) * (1 - THREE.MathUtils.smoothstep(u, 0.45, 0.5)) * 0.6;
      }
      glows.forEach((m) => (m.emissiveIntensity = 1.6 * heat));
      fireLight.intensity = (90 + Math.sin(t * 9) * 12) * heat * lightK;
    },
  };
}
