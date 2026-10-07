/**
 * Beacon guardians: the Aetherwing turtle and the Prowler dragon.
 * - Each is bound to one beacon and lives inside it. Opening the beacon
 *   summons it: a lightning strike on the crystal (forked bolts, ground arcs,
 *   embers, shockwave rings, a scorch on the water, camera kick), then it
 *   spirals up the beam from nothing and arcs out to its post
 *   (the dragon lands on the wall crest). Closing sends it back down the beam
 *   into the crystal. Deterministic tweens, restartable from any point.
 * - Re-tinted into the night palette; eyes, wing membranes and a rim light
 *   take on the beacon's colour.
 * - They defend the orb from the phoenix: always facing it, the turtle swims
 *   out to cut it off, and every few seconds each strikes (turtle barrel-roll
 *   lunge, dragon rearing flap), knocking the phoenix back.
 * - Interactive: they turn to the visitor on hover and strike on click.
 * Materials are re-tinted into the night palette (navy body, beacon-coloured glow).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { heightAt, WATER } from './terrain';
import { ORB_LIFT, ORB_R } from './phoenix';
import { createLightning } from './lightning';

export type GuardianId = 'turtle' | 'dragon';
export const GUARDIAN_NAMES: Record<GuardianId, string> = { turtle: 'Aetherwing', dragon: 'Prowler' };
/** One guardian per beacon, and only some beacons have one */
export const GUARDIAN_AT: Record<string, GuardianId> = { 'fire-and-blood': 'dragon', hikemate: 'turtle' };

type Glow = { mat: THREE.MeshStandardMaterial; base: number };
type Guardian = {
  id: GuardianId;
  root: THREE.Group;
  pivot: THREE.Group; // pointer-facing + reaction transforms live here
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  glows: Glow[];
  proxy: THREE.Mesh;
  hover: number;
  hoverTarget: number;
  react: number; // seconds left in the click reaction
};

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
// Moonlit blues from the island palette; dark enough for night, light enough to read against it
const NAVY = new THREE.Color('#8fb3e0');
const SHELL = new THREE.Color('#6f98cc');
const HIDE = new THREE.Color('#7f9fcc');

/** Shared rim light: a beacon-coloured fresnel edge so silhouettes read against the night */
const rim = { color: { value: new THREE.Color('#7fd8ff') }, strength: { value: 1.6 } };
function addRim(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uRimColor = rim.color;
    s.uniforms.uRimStrength = rim.strength;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        totalEmissiveRadiance += uRimColor * rimF * uRimStrength;`
      );
  };
}

/** Re-tint every material: keep the texture detail, pull the base colour into the night palette */
function tint(model: THREE.Object3D, rules: (name: string) => { color?: THREE.Color; glow?: number; opacity?: number } | null) {
  const glows: Glow[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.frustumCulled = false; // skinned bounds don't follow the animation
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
    mats.forEach((mat) => {
      if (!('emissive' in mat)) return;
      const r = rules(mat.name);
      if (!r) return;
      if (r.color) mat.color.copy(r.color);
      if (r.opacity !== undefined) {
        mat.transparent = true;
        mat.opacity = r.opacity;
        mat.depthWrite = false;
      }
      if (r.glow) {
        // Glow follows the texture's own detail, so patterns light up rather than flat-filling
        if (mat.map && !mat.emissiveMap) mat.emissiveMap = mat.map;
        mat.emissiveIntensity = r.glow;
        glows.push({ mat, base: r.glow });
      }
      addRim(mat);
      mat.needsUpdate = true;
    });
  });
  return glows;
}

async function loadGuardian(id: GuardianId, url: string, size: number, faceX: boolean): Promise<Guardian> {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  if (faceX) model.rotation.y = -Math.PI / 2; // nose along +x → +z, which lookAt aims
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const dims = box.getSize(new THREE.Vector3());
  const k = size / Math.max(dims.x, dims.z, 1e-3);
  model.scale.multiplyScalar(k);
  // Stand on y = 0
  model.position.y = -box.min.y * k;

  const glows =
    id === 'turtle'
      ? tint(model, (n) =>
          /eye/i.test(n) ? { glow: 4 } : /wing/i.test(n) ? { color: NAVY, glow: 1.6, opacity: 0.9 } : /shell/i.test(n) ? { color: SHELL, glow: 0.45 } : { color: NAVY, glow: 0.35 }
        )
      : tint(model, (n) => (/eye/i.test(n) ? { glow: 5 } : { color: HIDE, glow: 0.55 }));

  const pivot = new THREE.Group();
  pivot.add(model);
  const root = new THREE.Group();
  root.add(pivot);
  // Generous invisible pick volume; skinned meshes are costly and fiddly to raycast
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.y = size * 0.25;
  proxy.userData.guardian = id;
  root.add(proxy);

  const mixer = new THREE.AnimationMixer(model);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    // In place: drop bone translation (the clips carry root motion that would drag the
    // mesh far from where we put it); rotations alone carry the flapping and posing
    clip.tracks = clip.tracks.filter((t) => !t.name.endsWith('.position'));
    actions[clip.name] = mixer.clipAction(clip);
  }
  return { id, root, pivot, mixer, actions, glows, proxy, hover: 0, hoverTarget: 0, react: 0 };
}


type Opts = {
  reducedMotion: boolean;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  /** One render through the real (post-processed) pipeline, so shaders compile in the right variant */
  warm: () => void;
  onStrike?: () => void;
};
type Phoenix = { birdPos: () => THREE.Vector3; shove: (v: THREE.Vector3) => void };

const UP = new THREE.Vector3(0, 1, 0);
const RISE = 3; // seconds: burst, spiral up the beam, arc out to the post
const SINK = 1.3; // seconds: back down into the crystal
const CRYSTAL_Y = 1.6; // crystal height above the beacon base
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

type Phase = 'hidden' | 'rising' | 'guarding' | 'sinking';
/** One summon / dismiss move: a quadratic curve up (or down) the beacon's beam */
type Tween = { from: THREE.Vector3; ctrl: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; s0: number; s1: number };
type State = {
  phase: Phase;
  tw: Tween;
  scale: number;
  flare: number; // extra glow: 1 at the burst, fading out
  base: THREE.Vector3; // its beacon
  post: THREE.Vector3; // where it guards from
  strikeIn: number;
  threat: number; // smoothed 0..1: how close the phoenix is to the orb
};

/* ───────── Summon effect: a lightning strike onto the crystal ─────────
   Four flickers, each a freshly grown forked bolt from the sky, with an
   impact flare, a shockwave ring across the water and a light that strobes in step. */
const FLICKERS = [0, 0.09, 0.21, 0.42]; // seconds after the strike; each regrows the bolt
const STRIKE = 1.4;

function flareTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

/** Embers thrown up from the impact: shader-driven, so a strike costs no per-particle CPU work */
const EMBERS = 140;
const emberVert = /* glsl */ `
attribute vec3 aDir;
attribute float aSeed;
uniform float uT, uScale;
varying float vA;
void main() {
  float life = 0.9 + aSeed * 1.1;
  float k = clamp(uT / life, 0.0, 1.0);
  float speed = 9.0 + aSeed * 16.0;
  // Ballistic arc: outward and up, then gravity, with air drag
  float d = (1.0 - exp(-uT * 2.2)) / 2.2;
  vec3 p = position + aDir * speed * d + vec3(0.0, -9.0 * uT * uT * 0.5, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.25 + aSeed * 0.35) * uScale / -mv.z * (1.0 - k * 0.6);
  vA = (1.0 - k) * step(0.0001, uT) * step(uT, life);
}`;
const emberFrag = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.5) * 2.5 * a, a);
}`;

function buildEmbers(color: THREE.Color) {
  const pos = new Float32Array(EMBERS * 3);
  const dir = new Float32Array(EMBERS * 3);
  const seed = new Float32Array(EMBERS);
  for (let i = 0; i < EMBERS; i++) {
    const a = Math.random() * Math.PI * 2;
    const up = 0.35 + Math.random() * 0.9;
    const v = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).normalize();
    dir.set([v.x, v.y, v.z], i * 3);
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uniforms = { uT: { value: 0 }, uScale: { value: 300 }, uColor: { value: color } };
  const pts = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({ vertexShader: emberVert, fragmentShader: emberFrag, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  pts.frustumCulled = false;
  return { pts, uniforms };
}

function buildBurst() {
  const color = new THREE.Color();
  const group = new THREE.Group();
  const bolt = createLightning(color);
  // Crackle: short arcs skittering across the ground from the impact
  const arcs = [createLightning(color), createLightning(color)];
  const ringMat = () =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 96).rotateX(-Math.PI / 2), ringMat());
  ring.position.y = 0.4;
  // A second, thicker and slower ring: the pressure wave behind the flash
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 96).rotateX(-Math.PI / 2), ringMat());
  ring2.position.y = 0.35;
  // Scorched glow left on the water where it hit
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), ringMat());
  scorch.position.y = 0.32;
  const flare = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: flareTexture(), color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  flare.position.y = CRYSTAL_Y;
  const embers = buildEmbers(color);
  embers.pts.position.y = CRYSTAL_Y;
  // Lives outside the (often hidden) group at zero intensity: lights under an invisible parent
  // don't count, so toggling the group would change the light count and recompile every material
  const light = new THREE.PointLight(color, 0, 80, 1.3);
  group.add(ring, ring2, scorch, flare, embers.pts);

  let t = STRIKE;
  let next = 0;
  const at = new THREE.Vector3();
  const crystal = new THREE.Vector3();
  const sky = new THREE.Vector3();
  const ground = new THREE.Vector3();
  const regrow = (i: number) => {
    crystal.copy(at).add(tmpV.set(0, CRYSTAL_Y, 0));
    // From high above, a little off-vertical, down onto the crystal; the first hit is the heaviest
    sky.set(at.x + (Math.random() - 0.5) * 18, at.y + 75, at.z + (Math.random() - 0.5) * 18);
    bolt.strike(sky, crystal, i === 0 ? 11 : 8, 6);
    arcs.forEach((arc) => {
      const a = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * 6;
      ground.set(at.x + Math.cos(a) * r, Math.max(heightAt(at.x + Math.cos(a) * r, at.z + Math.sin(a) * r), WATER) + 0.3, at.z + Math.sin(a) * r);
      arc.strike(crystal, ground, 3, 2);
    });
  };
  const tmpV = new THREE.Vector3();
  return {
    group,
    bolts: [bolt.mesh, ...arcs.map((a) => a.mesh), light],
    setSize(w: number, h: number, dpr: number) {
      bolt.setSize(w, h, dpr);
      arcs.forEach((a) => a.setSize(w, h, dpr));
      embers.uniforms.uScale.value = (h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(21)));
    },
    /** Show everything once (fully transparent) so all shaders compile at load */
    prewarm() {
      const restore = [bolt, ...arcs].map((b) => b.prewarm());
      group.visible = true;
      return () => {
        restore.forEach((r) => r());
        group.visible = false;
      };
    },
    fire(base: THREE.Vector3, paint: THREE.Color) {
      at.copy(base);
      group.position.copy(base);
      light.position.copy(base).add(tmpV.set(0, 8, 0));
      color.copy(paint).lerp(new THREE.Color('#dfe9ff'), 0.45);
      t = 0;
      next = 0;
    },
    tick(dt: number) {
      if (t >= STRIKE) {
        bolt.alpha = 0;
        arcs.forEach((a) => (a.alpha = 0));
        group.visible = false;
        return;
      }
      group.visible = true;
      t += dt;
      while (next < FLICKERS.length && t >= FLICKERS[next]) regrow(next++);
      // Strobe: each flicker hits full, then drops fast; the whole strike fades out
      const since = t - FLICKERS[Math.max(0, next - 1)];
      const strobe = Math.exp(-since * 16) * 0.8 + 0.2;
      const fade = Math.max(0, 1 - t / STRIKE);
      // Main channel lingers as a faint ionised afterglow once the flickers stop
      bolt.alpha = strobe * Math.pow(fade, 0.6) * (t < 0.6 ? 1 : 0.3);
      arcs.forEach((a, i) => (a.alpha = Math.exp(-since * (20 + i * 6)) * (t < 0.55 ? 1 : 0)));
      flare.material.opacity = strobe * fade;
      flare.scale.setScalar(10 + strobe * 14);
      const k = Math.min(1, t / 1.1);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
      ring.scale.setScalar(1 + easeOut(k) * 24);
      const k2 = Math.min(1, t / STRIKE);
      (ring2.material as THREE.MeshBasicMaterial).opacity = (1 - k2) * 0.35;
      ring2.scale.setScalar(1 + easeOut(k2) * 14);
      (scorch.material as THREE.MeshBasicMaterial).opacity = Math.pow(fade, 1.5) * 0.45;
      scorch.scale.setScalar(4 + strobe * 2);
      embers.uniforms.uT.value = t;
      light.intensity = 1400 * strobe * Math.pow(fade, 2);
    },
  };
}

export function buildGuardians(scene: THREE.Scene, phoenix: Phoenix, { reducedMotion, renderer, warm, onStrike }: Opts) {
  const all: Guardian[] = [];
  const byId: Partial<Record<GuardianId, Guardian>> = {};
  const paint = new THREE.Color('#7fd8ff');
  const burst = buildBurst();
  // Bolts live in world space (from the sky / across the ground), not under the burst group
  scene.add(burst.group, ...burst.bolts);

  const state: Record<GuardianId, State> = {
    turtle: blank(),
    dragon: blank(),
  };
  function blank(): State {
    const v = () => new THREE.Vector3();
    return { phase: 'hidden', tw: { from: v(), ctrl: v(), to: v(), t: 1, dur: 1, s0: 0, s1: 0 }, scale: 0, flare: 0, base: v(), post: v(), strikeIn: 2, threat: 0 };
  }

  const ready = (g: Guardian) =>
    Promise.resolve().then(() => {
      // Compile its shaders and upload its textures / skinning data now, with one real
      // (post-processed) draw far below the ground, so the first summon doesn't stall
      g.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        ([] as THREE.Material[]).concat(m.material).forEach((mat) => {
          const sm = mat as THREE.MeshStandardMaterial;
          [sm.map, sm.emissiveMap, sm.normalMap, sm.roughnessMap, sm.metalnessMap].forEach((t) => t && renderer.initTexture(t));
        });
      });
      g.root.position.set(0, -500, 0);
      scene.add(g.root);
      warm();
      g.root.visible = false;
      g.root.scale.setScalar(0.001);
      all.push(g);
      byId[g.id] = g;
      g.glows.forEach((x) => x.mat.emissive.copy(paint));
      // Opened before it finished loading: summon it now
      if (wanted === g.id && pending?.id !== g.id) rise(g.id);
      return g;
    });
  loadGuardian('turtle', '/aetherwing_turtle.glb', 18, true)
    .then((g) => {
      g.actions['Flying_Turtle|Loop']?.play();
      return ready(g);
    })
    .catch((err) => console.warn('Turtle failed to load', err));
  loadGuardian('dragon', '/prowler_dragon.glb', 13, false)
    .then((g) => {
      const land = g.actions['Landing'];
      if (land) {
        land.setLoop(THREE.LoopOnce, 1);
        land.clampWhenFinished = true;
      }
      return ready(g);
    })
    .catch((err) => console.warn('Dragon failed to load', err));

  /* ───────── Focus view geometry ───────── */
  let wanted: GuardianId | null = null; // guardian of the open beacon
  const orb = new THREE.Vector3(); // orb centre being defended
  const right = new THREE.Vector3(); // screen-right on the focus view
  const toCam = new THREE.Vector3(); // horizontal, from the beacon toward the camera
  let hovered: GuardianId | null = null;
  const pointer = new THREE.Vector3();
  let hasPointer = false;
  let shake = 0; // camera kick, read by the world each frame
  let pending: { id: GuardianId; in: number } | null = null; // summon waiting for the camera

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const crystal = new THREE.Vector3();

  /** Highest ground within `r` of a spot: the wall crest the dragon stands on */
  function crestNear(spot: THREE.Vector3, r = 4) {
    let best = { y: -Infinity, x: spot.x, z: spot.z };
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      for (const k of [0, 0.5, 1]) {
        const x = spot.x + Math.cos(a) * r * k;
        const z = spot.z + Math.sin(a) * r * k;
        const y = heightAt(x, z);
        if (y > best.y) best = { y, x, z };
      }
    }
    return new THREE.Vector3(best.x, Math.max(best.y, WATER), best.z);
  }

  const crystalOf = (s: State) => crystal.copy(s.base).add(tmp.set(0, CRYSTAL_Y, 0));

  /** Begin the summon from wherever it is now (hidden → from the crystal) */
  function rise(id: GuardianId) {
    const g = byId[id];
    const s = state[id];
    if (!g) return;
    const from = s.phase === 'hidden' ? crystalOf(s).clone() : g.root.position.clone();
    s.tw = {
      from,
      // Up the beam first, then out: the control point sits high on the beam
      ctrl: crystalOf(s).clone().add(tmp.set(0, ORB_LIFT * 0.85, 0)),
      to: s.post.clone(),
      t: reducedMotion ? 1 : 0,
      dur: s.phase === 'hidden' ? RISE : RISE * 0.6,
      s0: s.scale,
      s1: 1,
    };
    if (s.phase === 'hidden') {
      s.flare = 1;
      g.root.position.copy(from);
      if (!reducedMotion) {
        burst.fire(s.base, paint);
        shake = Math.max(shake, 0.6);
        onStrike?.();
      }
    }
    s.phase = 'rising';
    s.strikeIn = 2.5;
    // Dragon holds its wings spread (landing's first frame) for the flight
    const land = g.actions['Landing'];
    if (id === 'dragon' && land) {
      land.reset().play();
      land.paused = true;
    }
  }
  /** Back down the beam into the crystal */
  function sink(id: GuardianId) {
    const g = byId[id];
    const s = state[id];
    if (!g || s.phase === 'hidden' || s.phase === 'sinking') return;
    s.tw = {
      from: g.root.position.clone(),
      ctrl: crystalOf(s).clone().add(tmp.set(0, ORB_LIFT * 0.6, 0)),
      to: crystalOf(s).clone(),
      t: reducedMotion ? 1 : 0,
      dur: SINK,
      s0: s.scale,
      s1: 0,
    };
    s.phase = 'sinking';
    s.flare = Math.max(s.flare, 0.6);
  }

  /** A strike at the phoenix: lunge and knock it back away from the orb */
  function strike(g: Guardian) {
    g.react = g.id === 'turtle' ? 2.2 : 2.6;
    if (g.id === 'turtle') {
      const fast = g.actions['Flying_Turtle|Wings_Fast'];
      const loop = g.actions['Flying_Turtle|Loop'];
      if (fast && loop) {
        fast.reset().play();
        loop.crossFadeTo(fast, 0.2, false);
      }
    } else g.actions['Landing']?.reset().play();
    const away = tmp.subVectors(phoenix.birdPos(), orb);
    away.y = Math.max(away.y, 2);
    phoenix.shove(away.normalize().multiplyScalar(g.id === 'turtle' ? 14 : 20));
    state[g.id].strikeIn = 4 + Math.random() * 3;
  }

  /** Smooth yaw toward a world point (yaw only: no fighting with pitch / roll) */
  function face(g: Guardian, at: THREE.Vector3, rate: number, dt: number) {
    const dx = at.x - g.root.position.x;
    const dz = at.z - g.root.position.z;
    if (dx * dx + dz * dz < 1e-4) return;
    const want = Math.atan2(dx, dz);
    let d = want - g.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.root.rotation.set(0, g.root.rotation.y + d * (1 - Math.exp(-dt * rate)), 0);
  }

  /** Point on the current tween, with a spiral round the beam on the way up */
  function along(s: State, out: THREE.Vector3) {
    const tw = s.tw;
    const e = easeInOut(tw.t);
    const u = 1 - e;
    out
      .copy(tw.from)
      .multiplyScalar(u * u)
      .addScaledVector(tw.ctrl, 2 * u * e)
      .addScaledVector(tw.to, e * e);
    if (s.phase === 'rising') {
      // One turn round the beam, widest midway, zero at both ends so the path stays continuous
      const r = Math.sin(e * Math.PI) * 3;
      const a = e * Math.PI * 2;
      out.x += Math.cos(a) * r;
      out.z += Math.sin(a) * r;
    }
    return out;
  }

  return {
    /**
     * Open a beacon (`who` = its guardian, or null if it has none) or close with base = null.
     * `color` is the beacon's paint; `viewYaw` is the camera's yaw on the focus view.
     */
    focus(base: THREE.Vector3 | null, color?: THREE.Color, viewYaw = 0, who: GuardianId | null = null) {
      if (color) paint.copy(color);
      const next = base ? who : null;
      pending = null;
      // Any other guardian goes home into its own beacon
      (Object.keys(state) as GuardianId[]).forEach((id) => id !== next && sink(id));
      wanted = next;
      if (!base || !next) return;
      const s = state[next];
      s.base.copy(base);
      orb.copy(base).add(tmp.set(0, ORB_LIFT, 0));
      toCam.set(Math.sin(viewYaw), 0, Math.cos(viewYaw));
      right.set(Math.cos(viewYaw), 0, -Math.sin(viewYaw));
      if (next === 'turtle') {
        // Screen-right flank, in front of the orb so the portal disc never hides it
        s.post.copy(orb).addScaledVector(right, 17).addScaledVector(toCam, 10).add(tmp.set(0, -2, 0));
      } else {
        // Screen-left wall crest, a little toward the camera, clear of the glow
        s.post.copy(crestNear(tmp.copy(base).addScaledVector(right, -13).addScaledVector(toCam, 5)));
      }
      // Hold the strike until the camera has nearly arrived (an already-visible guardian just moves)
      if (reducedMotion || state[next].phase !== 'hidden') rise(next);
      else pending = { id: next, in: 0.7 };
    },
    /** Pick volumes, for the world's raycaster: only once fully arrived */
    proxies: () => all.filter((g) => state[g.id].phase === 'guarding').map((g) => g.proxy),
    setHover(id: GuardianId | null) {
      hovered = id;
      all.forEach((g) => (g.hoverTarget = g.id === id ? 1 : 0));
    },
    setPointer(p: THREE.Vector3 | null) {
      hasPointer = !!p;
      if (p) pointer.copy(p);
    },
    /** The guardian currently on duty (fully arrived), if any */
    defender() {
      const g = wanted ? byId[wanted] : undefined;
      return g && state[g.id].phase === 'guarding' ? { id: g.id, pos: g.root.position } : null;
    },
    /** Visitor's click: the guardian strikes at once */
    poke(id: GuardianId) {
      const g = byId[id];
      if (g && g.react <= 0 && state[id].phase === 'guarding') strike(g);
    },
    /** Screen anchor for each guardian's label (guarding only) */
    anchors: () =>
      all
        .filter((g) => state[g.id].phase === 'guarding')
        .map((g) => ({ id: g.id, pos: g.root.position.clone().addScaledVector(UP, g.id === 'dragon' ? 8 : 5), hover: g.hover })),
    /** Camera kick for the summon, decaying; the world adds it as a small shake */
    shake: () => shake,
    setSize: burst.setSize,
    /** Show every strike effect (fully transparent) for the world's warm-up render; returns the undo */
    prewarm: burst.prewarm,
    tick(t: number, dt: number) {
      const P = phoenix.birdPos();
      rim.color.value.lerp(paint, 1 - Math.exp(-dt * 3));
      burst.tick(dt);
      shake *= Math.exp(-dt * 5);
      if (pending && (pending.in -= dt) <= 0) {
        const id = pending.id;
        pending = null;
        if (wanted === id) rise(id);
      }

      for (const g of all) {
        const s = state[g.id];
        g.mixer.update(reducedMotion ? 0 : dt);
        g.hover += (g.hoverTarget - g.hover) * (1 - Math.exp(-dt * 10));
        s.flare *= Math.exp(-dt * 1.4);
        g.react = Math.max(0, g.react - dt);

        /* Summon / dismiss along the beam */
        if (s.phase === 'rising' || s.phase === 'sinking') {
          s.tw.t = Math.min(1, s.tw.t + dt / s.tw.dur);
          along(s, tmp2);
          const prevX = g.root.position.x;
          const prevZ = g.root.position.z;
          g.root.position.copy(tmp2);
          // Grow in over the first 60% of the rise; shrink over the whole sink
          const k = s.phase === 'rising' ? easeOut(Math.min(1, s.tw.t / 0.6)) : easeInOut(s.tw.t);
          s.scale = THREE.MathUtils.lerp(s.tw.s0, s.tw.s1, k);
          // Face the direction of travel; settle toward the phoenix as it arrives
          tmp.set(g.root.position.x + (g.root.position.x - prevX) * 50, 0, g.root.position.z + (g.root.position.z - prevZ) * 50);
          face(g, s.tw.t > 0.8 ? P : tmp, 5, dt);
          if (s.tw.t >= 1) {
            if (s.phase === 'rising') {
              s.phase = 'guarding';
              if (g.id === 'dragon') {
                g.actions['Landing']?.reset().play();
                if (!reducedMotion) shake = Math.max(shake, 0.35);
              }
            } else s.phase = 'hidden';
          }
        }

        /* Guarding */
        if (s.phase === 'guarding') {
          s.scale = 1;
          s.threat += (THREE.MathUtils.clamp(1 - (P.distanceTo(orb) - 12) / 14, 0, 1) - s.threat) * (1 - Math.exp(-dt * 2));
          const look = hovered === g.id && hasPointer ? pointer : P;
          if (g.id === 'turtle') {
            // Holds its flank; swims out toward the phoenix as it closes in
            const between = tmp.subVectors(P, orb).normalize().multiplyScalar(ORB_R + 6).add(orb);
            tmp2.copy(s.post).lerp(between, 0.15 + s.threat * 0.3);
            // Never behind the portal disc
            const ahead = tmp.subVectors(tmp2, orb).dot(toCam);
            if (ahead < 6) tmp2.addScaledVector(toCam, 6 - ahead);
            tmp2.y = Math.max(tmp2.y, s.base.y + 4) + Math.sin(t * 0.9) * 0.8;
            g.root.position.lerp(tmp2, 1 - Math.exp(-dt * 1.6));
            face(g, look, 4, dt);
            // Strike: a barrel roll lunging forward
            const k = g.react > 0 ? 1 - g.react / 2.2 : 0;
            g.pivot.rotation.z = k * Math.PI * 2;
            g.pivot.position.z = Math.sin(k * Math.PI) * 4;
            if (g.react <= 0) {
              const fast = g.actions['Flying_Turtle|Wings_Fast'];
              const loop = g.actions['Flying_Turtle|Loop'];
              if (fast?.isRunning() && loop && !loop.isRunning()) {
                loop.reset().play();
                fast.crossFadeTo(loop, 0.4, false);
              }
            }
          } else {
            g.root.position.copy(s.post);
            face(g, look, 3, dt);
            // Strike: rear up and lunge; between strikes, slow breathing
            const k = g.react > 0 ? Math.sin((1 - g.react / 2.6) * Math.PI) : 0;
            g.pivot.position.z = k * 2.2;
            g.pivot.rotation.x = -k * 0.25;
            g.pivot.scale.setScalar(1 + Math.sin(t * 1.6) * 0.012);
          }
          if (!reducedMotion) {
            s.strikeIn -= dt;
            const near = g.root.position.distanceTo(P) < (g.id === 'turtle' ? 16 : 30);
            if (s.strikeIn <= 0 && near && g.react <= 0) strike(g);
          }
        } else {
          // Not guarding: no leftover strike pose
          g.pivot.rotation.set(0, 0, 0);
          g.pivot.position.set(0, 0, 0);
        }

        g.root.visible = s.phase !== 'hidden' && s.scale > 0.002;
        g.root.scale.setScalar(Math.max(0.001, s.scale));
        // Glow: flares with the summon, on hover, and on each strike
        const pulse = 1 + s.flare * 4 + g.hover * 1.4 + (g.react > 0 ? 1.6 * (g.react / 2.6) : 0);
        g.glows.forEach((x) => {
          x.mat.emissive.lerp(paint, 1 - Math.exp(-dt * 3));
          x.mat.emissiveIntensity = x.base * pulse;
        });
      }
    },
  };
}
