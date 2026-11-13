/**
 * A beacon per place, each embodying an element:
 *   fire  — a real flame on a ring of stones and glowing coals, dark smoke above, embers flying
 *   water — a floating orb of water with a living surface, two streams whipping round it,
 *           droplets arcing out and falling, a faint mist
 *   earth — a chunky stone heart with boulders tumbling around it, a low dust cloud, grit drifting
 *   air   — a slender shard inside spinning wind arcs, a twisting plume, motes whirled wide
 *   spirit (Home) — every element at once
 * All share a coloured point light that tints the rock, a soft halo and a faint light shaft,
 * so a beacon can still be spotted from across the valley. Sparks share one Points draw call.
 */
import * as THREE from 'three';
import type { Place, PlaceElement } from './places';
import { heightAt, noiseGlsl, WATER } from './terrain';

export type Beacon = {
  id: string;
  base: number;
  anchor: THREE.Vector3;
  hover: number;
  /** 1 once the visitor has opened this place; eases toward it for a soft, lasting glow */
  lit: number;
  litWant: number;
  /** 1 while the hero calls on this beacon's element */
  elGlow: number;
  elWant: number;
  /** 1 while another element is on stage: this beacon steps back */
  dim: number;
  dimWant: number;
  /** Featured places stand taller and burn brighter */
  size: number;
  element: PlaceElement;
  halo: THREE.Sprite;
  light: THREE.PointLight;
  smoke: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  group: THREE.Group;
  /** Element-specific motion; `yaw` turns billboards (flames) to the camera, `dist` is the camera's distance */
  animate: (t: number, glow: number, yaw: number, dist: number) => void;
  /** Plume strength before dimming */
  gain: number;
};

const KIND: Record<PlaceElement, number> = { fire: 0, water: 1, earth: 2, air: 3, spirit: 4 };

/** Plume character per element; fire's is dark smoke, water's a pale mist */
const PLUME: Record<PlaceElement, { rise: number; spread: number; sway: number; swirl: number; len: number; gain: number; dark: number; lift: number }> = {
  fire: { rise: 0.7, spread: 0.45, sway: 0.5, swirl: 0.02, len: 0.85, gain: 0.55, dark: 1, lift: 3.2 },
  water: { rise: 0.14, spread: 0.95, sway: 0.3, swirl: 0, len: 0.32, gain: 0.32, dark: 0, lift: 0 },
  earth: { rise: 0.22, spread: 0.7, sway: 0.2, swirl: 0, len: 0.42, gain: 0.75, dark: 0, lift: 0 },
  air: { rise: 0.85, spread: 0.32, sway: 1.2, swirl: 0.14, len: 0.95, gain: 0.8, dark: 0, lift: 0 },
  spirit: { rise: 0.55, spread: 0.42, sway: 0.55, swirl: 0.05, len: 1, gain: 1, dark: 0, lift: 0 },
};

const SMOKE_W = 9;
const SMOKE_H = 26;
const smokeVert = /* glsl */ `
varying vec2 vUv;
varying float vDist;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
/** Plume: noise advected upward and sheared sideways with height; each element tunes speed, width, sway and twist */
const smokeFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime, uSeed, uBoost, uFogDensity;
uniform float uRise, uSpread, uSway, uSwirl, uLen, uGain, uDark;
varying vec2 vUv;
varying float vDist;
${noiseGlsl}
void main() {
  float y = vUv.y;
  float sway = (noise(vec2(y * 1.5 - uTime * 0.12, uSeed)) - 0.5) * uSway * y + sin(y * 11.0 - uTime * 3.2 + uSeed) * uSwirl * y;
  float x = (vUv.x - 0.5 - sway) / (0.1 + y * uSpread);
  if (abs(x) > 1.0) discard;
  vec2 p = vec2(x * 1.4, y * 4.5 - uTime * uRise) + uSeed;
  float n = fbm3(p + fbm3(p * 1.7 + uTime * 0.1) * 0.9);
  float body = smoothstep(1.0, 0.15, abs(x)) * smoothstep(0.28, 0.7, n);
  float a = body * smoothstep(0.0, 0.06, y) * (1.0 - smoothstep(uLen * 0.45, uLen, y));
  float fog = exp(-uFogDensity * uFogDensity * vDist * vDist * 0.6);
  if (uDark > 0.5) {
    // Smoke off a fire: soot, lit warm from below for the first stretch
    vec3 soot = mix(vec3(0.32, 0.16, 0.07), vec3(0.06, 0.06, 0.07), smoothstep(0.0, 0.2, y));
    gl_FragColor = vec4(soot, a * uGain * fog);
    return;
  }
  vec3 col = mix(uColor * 1.6, uColor * 0.55 + vec3(0.08, 0.12, 0.2), smoothstep(0.0, 0.6, y));
  a *= uGain * (0.55 + uBoost * 0.35) * fog;
  gl_FragColor = vec4(col * a, a);
}`;

/** Flame: a teardrop of noise licking upward, coloured by heat from deep red to white-hot */
const flameVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const flameFrag = /* glsl */ `
uniform float uTime, uSeed, uBoost;
uniform vec3 uTint;
varying vec2 vUv;
${noiseGlsl}
void main() {
  float y = vUv.y;
  // Two noise layers scroll upward at different speeds: the body licks, the edges tear
  float n1 = fbm3(vec2(vUv.x * 3.0, y * 2.4 - uTime * 2.1) + uSeed);
  float n2 = fbm3(vec2(vUv.x * 7.0 + 3.1, y * 5.5 - uTime * 3.6) + uSeed * 1.7);
  float x = (vUv.x - 0.5) + (n1 - 0.5) * 0.42 * y + (n2 - 0.5) * 0.14 * y;
  // Wide at the root, drawn to a point; the hover makes it roar a little taller and wider
  float w = mix(0.3, 0.015, pow(y, 0.85 - uBoost * 0.15)) * (1.0 + uBoost * 0.2);
  float shape = 1.0 - smoothstep(w * 0.45, w, abs(x));
  shape *= smoothstep(0.0, 0.07, y);
  float heat = shape * clamp(n2 * 0.9 + (1.0 - y) * 1.15 - 0.3, 0.0, 1.0);
  heat = clamp(heat * 1.15, 0.0, 1.0);
  // Mostly orange and gold; only the very root burns near white, so it reads as fire from across the valley
  vec3 col = mix(vec3(0.5, 0.04, 0.0), vec3(1.0, 0.3, 0.02), smoothstep(0.08, 0.4, heat));
  col = mix(col, vec3(1.0, 0.62, 0.16), smoothstep(0.4, 0.75, heat));
  col = mix(col, vec3(1.0, 0.9, 0.62), smoothstep(0.82, 1.0, heat));
  // A breath of the project's colour in the cooler outer flame
  col = mix(col, uTint, 0.18 * (1.0 - smoothstep(0.2, 0.6, heat)));
  float a = smoothstep(0.03, 0.3, heat);
  gl_FragColor = vec4(col * a * 1.5, a);
}`;

/** Water orb: a wobbling surface, deep body with shifting light inside, bright rim and a sharp highlight */
const orbVert = /* glsl */ `
uniform float uTime, uSeed;
varying vec3 vN;
varying vec3 vView;
varying vec3 vObj;
void main() {
  vec3 p = position;
  float d = sin(p.x * 4.0 + uTime * 2.1 + uSeed) * sin(p.y * 5.0 + uTime * 1.7) * sin(p.z * 4.5 + uTime * 2.4) * 0.09
          + sin(p.y * 9.0 - uTime * 3.0 + uSeed) * 0.025;
  p += normal * d;
  vObj = p;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const orbFrag = /* glsl */ `
uniform float uTime, uBoost;
uniform vec3 uDeep, uShallow;
varying vec3 vN;
varying vec3 vView;
varying vec3 vObj;
${noiseGlsl}
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vView);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
  // Caustic shimmer: two noise fields crossing make the bright, moving web light makes in water
  float c1 = noise(vObj.xy * 3.2 + vec2(uTime * 0.5, -uTime * 0.35));
  float c2 = noise(vObj.zy * 3.6 - vec2(uTime * 0.4, uTime * 0.3));
  float caustic = pow(1.0 - abs(c1 - c2), 6.0);
  vec3 col = mix(uDeep, uShallow, 0.25 + caustic * 0.75);
  vec3 L = normalize(vec3(0.35, 0.85, 0.4));
  float spec = pow(max(dot(n, normalize(L + v)), 0.0), 90.0);
  float spec2 = pow(max(dot(n, normalize(vec3(-0.6, 0.2, 0.5) + v)), 0.0), 40.0) * 0.4;
  col += fres * vec3(0.75, 0.92, 1.0) * (0.9 + uBoost * 0.5) + (spec + spec2) * 1.6;
  float a = clamp(0.38 + fres * 0.6 + spec + caustic * 0.15, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}`;

/** Water stream: a tube of water flowing along an arc, streaked and foamy, tapering at both ends */
const streamVert = /* glsl */ `
uniform float uTime, uSeed;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
void main() {
  vUv = uv;
  vec3 p = position + normal * sin(uv.x * 40.0 - uTime * 6.0 + uSeed) * 0.02;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const streamFrag = /* glsl */ `
uniform float uTime, uSeed, uBoost;
uniform vec3 uDeep, uShallow;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
${noiseGlsl}
void main() {
  float flow = vUv.x * 22.0 - uTime * 3.2;
  float streak = noise(vec2(flow, vUv.y * 6.0 + uSeed));
  float fine = noise(vec2(flow * 2.7, vUv.y * 12.0 - uSeed));
  float foam = smoothstep(0.7, 0.92, streak * 0.7 + fine * 0.5);
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.0);
  vec3 col = mix(uDeep, uShallow, streak) + fres * vec3(0.6, 0.85, 1.0) * 0.7 + foam * vec3(0.9, 0.97, 1.0);
  float taper = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
  float a = (0.3 + fres * 0.5 + foam * 0.6 + streak * 0.15) * taper * (0.85 + uBoost * 0.3);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}`;

const SPARKS = 70;
const LIGHT = 140;

function glowTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const shaftVert = /* glsl */ `
varying float vY;
void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const shaftFrag = /* glsl */ `
uniform vec3 uColor; uniform float uAlpha; varying float vY;
void main() { float a = pow(1.0 - vY, 2.0) * uAlpha; gl_FragColor = vec4(uColor * a, a); }`;

/** Sparks move by element: 0 embers, 1 droplets arcing out and falling, 2 drifting grit, 3 whirling motes */
const sparkVert = /* glsl */ `
attribute vec3 aBase; attribute vec3 aColor; attribute float aSeed; attribute float aIdx; attribute float aKind;
uniform float uTime, uScale, uDensity; uniform float uBoost[16];
varying vec3 vColor; varying float vA;
void main() {
  // Low quality: a share of the sparks simply sit out, clipped away before any work
  if (fract(aSeed * 13.7) > uDensity) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vColor = vec3(0.0); vA = 0.0; return; }
  float boost = uBoost[int(aIdx)];
  int kind = int(aKind + 0.5);
  float s1 = fract(aSeed * 7.13), s2 = fract(aSeed * 3.7), s3 = fract(aSeed * 5.3);
  float t, ang, rad, h, size = 1.0 + s3 * 1.6;
  float fade = 1.0;
  if (kind == 0) {
    // Fire: embers ride the heat, jittering as they climb, and wink out
    t = fract(uTime * (0.22 + s1 * 0.25) + aSeed);
    ang = aSeed * 61.0 + uTime * 0.6;
    rad = (0.1 + s2 * 0.5) * (1.0 + t * 1.2) + sin(uTime * 4.0 + aSeed * 30.0) * 0.12 * t;
    h = 1.2 + t * (7.5 + boost * 5.0);
    size *= 0.55 + 0.45 * step(0.3, fract(uTime * 3.0 + aSeed * 9.0));
  } else if (kind == 1) {
    // Water: droplets thrown off the orb, arcing out and falling back under gravity
    t = fract(uTime * (0.32 + s1 * 0.25) + aSeed);
    ang = aSeed * 61.0;
    rad = 0.75 + t * (1.0 + s2 * 1.4);
    h = 1.0 + t * (3.2 + boost * 1.5) - t * t * 4.0;
    size *= 0.7;
    fade = smoothstep(0.0, 0.15, h);
  } else if (kind == 2) {
    // Earth: heavy grit drifting low and wide
    t = fract(uTime * (0.05 + s1 * 0.06) + aSeed);
    ang = aSeed * 61.0 + uTime * 0.15;
    rad = 0.6 + s2 * 2.6;
    h = t * (2.2 + boost * 1.5);
    size *= 1.5;
  } else {
    // Air: motes whirled wide on a widening spiral
    t = fract(uTime * (0.12 + s1 * 0.14) + aSeed);
    ang = aSeed * 61.0 + uTime * 2.6 + t * 9.0;
    rad = 0.5 + t * (2.6 + s2);
    h = t * (7.0 + boost * 5.0);
  }
  vec3 p = aBase + vec3(cos(ang) * rad, h, sin(ang) * rad);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size * uScale / -mv.z * (1.0 - t * 0.5);
  vColor = aColor;
  vA = (1.0 - t) * smoothstep(0.0, 0.08, t) * (0.6 + boost * 0.4) * fade;
}`;
const sparkFrag = /* glsl */ `
varying vec3 vColor; varying float vA;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA;
  gl_FragColor = vec4(vColor * 2.0 * a, a);
}`;

const FIRE_LIGHT = new THREE.Color('#ff8a2a');
const WATER_DEEP = new THREE.Color('#062a4a');
const WATER_SHALLOW = new THREE.Color('#3fb6e6');

/** Spark tint per element: embers burn orange whatever the project colour, droplets read as water */
function sparkTint(kind: number, paint: THREE.Color) {
  const c = paint.clone();
  if (kind === 0) return new THREE.Color('#ff7a1a').lerp(new THREE.Color('#ffd27a'), Math.random() * 0.6);
  if (kind === 1) return c.lerp(new THREE.Color('#e6f7ff'), 0.7);
  if (kind === 2) return c.multiplyScalar(0.55).add(new THREE.Color(0.16, 0.13, 0.1));
  return c.lerp(new THREE.Color('#ffffff'), 0.55);
}

/** Additive, unlit material for wind arcs */
const glowMat = (color: THREE.Color, opacity: number) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

export function buildBeacons(places: Place[], fog: THREE.FogExp2) {
  const group = new THREE.Group();
  const glow = glowTexture();
  const geo = {
    earth: new THREE.DodecahedronGeometry(0.85, 0),
    air: new THREE.OctahedronGeometry(0.5, 0).scale(1, 2.3, 1),
    spirit: new THREE.OctahedronGeometry(0.7, 0).scale(1, 1.7, 1),
    orb: new THREE.IcosahedronGeometry(0.85, 5),
    stream: new THREE.TorusGeometry(1.45, 0.11, 12, 160, Math.PI * 1.45),
    arc: new THREE.TorusGeometry(1.35, 0.022, 6, 48, Math.PI * 1.3),
    stone: new THREE.DodecahedronGeometry(0.26, 0),
    flame: new THREE.PlaneGeometry(2.3, 4.2).translate(0, 2.1, 0),
    hearth: new THREE.DodecahedronGeometry(0.3, 0),
    coal: new THREE.DodecahedronGeometry(0.17, 0),
  };
  const shaftGeo = new THREE.CylinderGeometry(0.15, 0.9, 11, 16, 1, true).translate(0, 5.5, 0);
  // Base of the plume sits on the beacon; it turns to face the camera around its own vertical axis
  const smokeGeo = new THREE.PlaneGeometry(SMOKE_W, SMOKE_H).translate(0, SMOKE_H / 2 + 0.6, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#4a4038', roughness: 0.95, flatShading: true });
  const hearthMat = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 1, flatShading: true });
  const coalMat = new THREE.MeshStandardMaterial({ color: '#1a0d06', emissive: '#ff4a0a', emissiveIntensity: 2.2, roughness: 0.9, flatShading: true });

  const flameMat = (seed: number, tint: THREE.Color) =>
    new THREE.ShaderMaterial({
      vertexShader: flameVert,
      fragmentShader: flameFrag,
      uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uBoost: { value: 0 }, uTint: { value: tint } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  const waterUniforms = (seed: number, tint: THREE.Color) => ({
    uTime: { value: 0 },
    uSeed: { value: seed },
    uBoost: { value: 0 },
    uDeep: { value: WATER_DEEP.clone().lerp(tint, 0.15) },
    uShallow: { value: WATER_SHALLOW.clone().lerp(tint, 0.3) },
  });

  const beacons: Beacon[] = places.map((p, i) => {
    const el = p.element;
    const has = (e: PlaceElement) => el === e || el === 'spirit';
    // Hover just above the water when the spot is in a channel
    const base = Math.max(heightAt(p.x, p.z), WATER + 0.5);
    const g = new THREE.Group();
    g.position.set(p.x, base, p.z);
    group.add(g);
    const color = new THREE.Color(p.paint);
    const size = p.featured ? 1.3 : 1;
    // Fire lights the rock orange and water a cool aqua, a little of the project's colour mixed in
    const lightColor = el === 'fire' ? FIRE_LIGHT.clone().lerp(color, 0.25) : el === 'water' ? WATER_SHALLOW.clone().lerp(color, 0.5) : color;
    /** Everything that ticks with time */
    const timed: THREE.ShaderMaterial[] = [];

    // Heart: the floating piece and its element companions bob together at crystal height
    const heart = new THREE.Group();
    heart.position.y = 1.6;
    heart.scale.setScalar(size);
    let core: THREE.Mesh | null = null;
    if (el === 'earth' || el === 'air' || el === 'spirit') {
      core = new THREE.Mesh(
        geo[el],
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: el === 'earth' ? 1.8 : 3,
          roughness: el === 'earth' ? 0.85 : 0.3,
          flatShading: el === 'earth',
        })
      );
      heart.add(core);
    }

    // Water: a floating orb with two streams whipping round it
    const streams: THREE.Mesh[] = [];
    let orb: THREE.Mesh | null = null;
    if (el === 'water') {
      const m = new THREE.ShaderMaterial({ vertexShader: orbVert, fragmentShader: orbFrag, uniforms: waterUniforms(i * 3.1, color), transparent: true });
      orb = new THREE.Mesh(geo.orb, m);
      timed.push(m);
      heart.add(orb);
    }
    if (has('water')) {
      for (let k = 0; k < 2; k++) {
        const m = new THREE.ShaderMaterial({
          vertexShader: streamVert,
          fragmentShader: streamFrag,
          uniforms: waterUniforms(i * 3.1 + k * 5.7, color),
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const s = new THREE.Mesh(geo.stream, m);
        s.scale.setScalar(k ? 0.82 : 1);
        streams.push(s);
        timed.push(m);
        heart.add(s);
      }
    }

    // Earth: boulders tumbling in a slow orbit
    const stones: { m: THREE.Mesh; a: number; r: number; y: number }[] = [];
    if (has('earth')) {
      const n = el === 'spirit' ? 3 : 5;
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(geo.stone, rockMat);
        m.scale.setScalar(0.7 + ((k * 37) % 10) / 12);
        stones.push({ m, a: (k / n) * Math.PI * 2, r: el === 'spirit' ? 2.1 : 1.5 + (k % 2) * 0.35, y: ((k % 3) - 1) * 0.45 });
        heart.add(m);
      }
    }
    // Air: three open arcs on tilted axes, spinning like gusts
    const arcs: THREE.Mesh[] = [];
    if (has('air')) {
      const wind = color.clone().lerp(new THREE.Color('#ffffff'), 0.6);
      for (let k = 0; k < 3; k++) {
        const arc = new THREE.Mesh(geo.arc, glowMat(wind, 0.55));
        arc.rotation.set(Math.PI / 2 + (k - 1) * 0.5, k * 1.1, 0);
        arc.scale.setScalar(1 + k * 0.18);
        arcs.push(arc);
        heart.add(arc);
      }
    }

    // Fire: a hearth of stones round glowing coals, two flame sheets turned to the camera
    const flames: THREE.Mesh[] = [];
    let coalGlow: THREE.MeshStandardMaterial | null = null;
    let hearth: THREE.Group | null = null;
    if (el === 'fire') {
      coalGlow = coalMat.clone();
      hearth = new THREE.Group();
      hearth.position.y = 0.15;
      hearth.scale.setScalar(size);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const stone = new THREE.Mesh(geo.hearth, hearthMat);
        stone.position.set(Math.cos(a) * 0.95, 0.05, Math.sin(a) * 0.95);
        stone.rotation.set(k, k * 2.3, 0);
        stone.scale.set(1.1, 0.8 + (k % 3) * 0.15, 1);
        hearth.add(stone);
      }
      for (let k = 0; k < 7; k++) {
        const a = k * 2.4;
        const coal = new THREE.Mesh(geo.coal, coalGlow);
        coal.position.set(Math.cos(a) * (0.15 + (k % 3) * 0.2), 0.05 + (k % 2) * 0.08, Math.sin(a) * (0.15 + (k % 3) * 0.2));
        coal.rotation.set(k, k * 1.7, 0);
        hearth.add(coal);
      }
      const tint = color.clone();
      [0, 1].forEach((k) => {
        const m = flameMat(i * 4.3 + k * 9.1, tint);
        const f = new THREE.Mesh(geo.flame, m);
        f.position.y = 0.1;
        f.scale.setScalar(k ? 0.62 : 1);
        f.renderOrder = 4 + k;
        flames.push(f);
        timed.push(m);
        hearth!.add(f);
      });
      g.add(hearth);
    }

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glow, color: el === 'fire' ? FIRE_LIGHT : lightColor, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })
    );
    halo.position.y = el === 'fire' ? 1.2 : 1.6;
    halo.scale.setScalar(7);
    const shaft = new THREE.Mesh(
      shaftGeo,
      new THREE.ShaderMaterial({
        vertexShader: shaftVert,
        fragmentShader: shaftFrag,
        uniforms: { uColor: { value: el === 'fire' ? FIRE_LIGHT : lightColor }, uAlpha: { value: p.featured ? 0.34 : el === 'fire' ? 0.1 : 0.22 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    const light = new THREE.PointLight(lightColor, LIGHT, 34, 1.6);
    light.position.y = el === 'fire' ? 1.4 : 2.4;
    const pl = PLUME[el];
    const smoke = new THREE.Mesh(
      smokeGeo,
      new THREE.ShaderMaterial({
        vertexShader: smokeVert,
        fragmentShader: smokeFrag,
        uniforms: {
          uColor: { value: el === 'water' ? color.clone().lerp(new THREE.Color('#e8f6ff'), 0.75) : color },
          uTime: { value: 0 },
          uSeed: { value: i * 7.31 },
          uBoost: { value: 0 },
          uFogDensity: { value: fog.density },
          uRise: { value: pl.rise },
          uSpread: { value: pl.spread },
          uSway: { value: pl.sway },
          uSwirl: { value: pl.swirl },
          uLen: { value: pl.len },
          uGain: { value: pl.gain },
          uDark: { value: pl.dark },
        },
        transparent: true,
        depthWrite: false,
        // Soot darkens what is behind it; every other plume adds light
        blending: pl.dark ? THREE.NormalBlending : THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    smoke.position.y = pl.lift * size;
    smoke.renderOrder = 3;
    // Featured: a shaft twice as tall and a fuller plume, so they read from across the valley
    if (p.featured) {
      shaft.scale.set(1.3, 2.2, 1.3);
      smoke.scale.set(1.25, 1.45, 1);
    }
    g.add(heart, halo, shaft, light, smoke);

    const animate = (t: number, glowAmt: number, yaw: number, dist: number) => {
      timed.forEach((m) => {
        m.uniforms.uTime.value = t;
        m.uniforms.uBoost.value = glowAmt;
      });
      // From afar a campfire is a pinprick: the hearth grows with distance so the flame keeps its shape
      if (hearth) hearth.scale.setScalar(size * (1 + THREE.MathUtils.clamp((dist - 50) / 110, 0, 1.3)));
      heart.position.y = 1.6 + Math.sin(t * 1.4 + i * 1.7) * (el === 'earth' ? 0.12 : el === 'water' ? 0.18 : 0.25);
      if (core) core.rotation.y = t * (el === 'air' ? 2.2 : el === 'earth' ? 0.25 : 0.8) + i;
      if (el === 'earth' && core) core.rotation.x = t * 0.15;
      if (orb) orb.rotation.y = t * 0.3;
      flames.forEach((f, k) => (f.rotation.y = yaw + (k ? 0.5 : 0)));
      // Coals breathe: brighter as the fire draws, hotter while hovered
      if (coalGlow) coalGlow.emissiveIntensity = 1.8 + Math.sin(t * 2.3 + i) * 0.5 + glowAmt;
      streams.forEach((s, k) => {
        // Each stream sweeps round on its own tilt, like water being whipped
        s.rotation.set(Math.PI / 2 + (k ? -0.55 : 0.35) + Math.sin(t * 0.7 + k) * 0.12, k ? 1.2 : 0, t * (k ? -1.6 : 1.25));
      });
      stones.forEach((s, k) => {
        const a = s.a + t * 0.35;
        s.m.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * 1.1 + k) * 0.15, Math.sin(a) * s.r);
        s.m.rotation.set(t * 0.7 + k, t * 0.5 + k * 2, 0);
      });
      arcs.forEach((arc, k) => {
        arc.rotation.z = t * (2.4 + k * 0.7) * (k % 2 ? -1 : 1);
        (arc.material as THREE.MeshBasicMaterial).opacity = 0.4 + glowAmt * 0.35 + Math.sin(t * 3 + k) * 0.1;
      });
    };

    // Anchor at the crystal so the HTML ring encircles the light
    return {
      id: p.id, base, anchor: new THREE.Vector3(p.x, base + 1.6, p.z), hover: 0, lit: 0, litWant: 0, elGlow: 0, elWant: 0, dim: 0, dimWant: 0, size, element: el,
      halo, light, smoke, group: g, animate, gain: pl.gain,
    };
  });

  /* Sparks */
  const n = places.length * SPARKS;
  const aBase = new Float32Array(n * 3);
  const aColor = new Float32Array(n * 3);
  const aSeed = new Float32Array(n);
  const aIdx = new Float32Array(n);
  const aKind = new Float32Array(n);
  const col = new THREE.Color();
  places.forEach((p, i) => {
    col.set(p.paint);
    const own = KIND[p.element];
    for (let k = 0; k < SPARKS; k++) {
      const j = i * SPARKS + k;
      // Home's sparks take turns being each element
      const kind = own === 4 ? k % 4 : own;
      const c = sparkTint(kind, col);
      aBase.set([p.x, beacons[i].base + 0.6, p.z], j * 3);
      aColor.set([c.r, c.g, c.b], j * 3);
      aSeed[j] = Math.random();
      aIdx[j] = i;
      aKind[j] = kind;
    }
  });
  const sparkGeo = new THREE.BufferGeometry();
  // Positions are computed in the shader; a placeholder attribute keeps three happy
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(aBase, 3));
  sparkGeo.setAttribute('aBase', new THREE.BufferAttribute(aBase, 3));
  sparkGeo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  sparkGeo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  sparkGeo.setAttribute('aIdx', new THREE.BufferAttribute(aIdx, 1));
  sparkGeo.setAttribute('aKind', new THREE.BufferAttribute(aKind, 1));
  const sparkMat = new THREE.ShaderMaterial({
    vertexShader: sparkVert,
    fragmentShader: sparkFrag,
    uniforms: { uTime: { value: 0 }, uScale: { value: 300 }, uDensity: { value: 1 }, uBoost: { value: new Array(16).fill(0) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  group.add(sparks);

  return {
    group,
    beacons,
    /** Point size scale: framebuffer height / (2 tan(fov / 2)) × spark size in world units */
    setScale: (s: number) => void (sparkMat.uniforms.uScale.value = s),
    /** Low quality: no smoke plumes, half the sparks */
    setLow(low: boolean) {
      sparkMat.uniforms.uDensity.value = low ? 0.5 : 1;
      beacons.forEach((b) => (b.smoke.visible = !low));
    },
    tick(t: number, camera: THREE.Camera) {
      sparkMat.uniforms.uTime.value = t;
      const boost = sparkMat.uniforms.uBoost.value as number[];
      beacons.forEach((b, i) => {
        b.lit += (b.litWant - b.lit) * 0.03;
        b.elGlow += (b.elWant - b.elGlow) * 0.05;
        b.dim += (b.dimWant - b.dim) * 0.05;
        // Another element on stage: this beacon steps back, so the chosen ones stand out
        const keep = 1 - b.dim * 0.6;
        // A visited beacon keeps a little of its hover glow; its element's turn in the headline stirs it more
        const glowAmt = Math.max(b.hover, b.lit * 0.35, b.elGlow * 0.6);
        boost[i] = glowAmt;
        const su = b.smoke.material.uniforms;
        su.uTime.value = t;
        su.uBoost.value = glowAmt;
        su.uGain.value = b.gain * keep;
        (b.halo.material as THREE.SpriteMaterial).opacity = 1 - b.dim * 0.55;
        const yaw = Math.atan2(camera.position.x - b.anchor.x, camera.position.z - b.anchor.z);
        b.smoke.rotation.y = yaw;
        b.animate(t, glowAmt, yaw, camera.position.distanceTo(b.anchor));
        const fire = b.element === 'fire';
        if (!fire) b.halo.position.y = 1.6 + Math.sin(t * 1.4 + i * 1.7) * 0.25;
        // Fire's halo and light gutter like a flame; the rest pulse gently
        const flick = fire ? 0.82 + Math.sin(t * 13 + i) * 0.1 + Math.sin(t * 7.7 + i * 3) * 0.08 + Math.sin(t * 23.1 + i) * 0.04 : 0.92 + Math.sin(t * 5.3 + i * 2.1) * 0.08;
        b.halo.scale.setScalar((fire ? 6 + glowAmt * 4 : 9 + glowAmt * 6 + Math.sin(t * 3 + i) * 0.5) * b.size * (fire ? flick : 1));
        b.light.intensity = LIGHT * b.size * (1 + glowAmt * 1.4) * flick * keep;
      });
    },
  };
}
