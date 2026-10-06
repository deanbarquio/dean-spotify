/**
 * Night valley: a heightfield carved into a labyrinth of concentric ridges
 * (each with gaps, joined by a few radial walls), rising into hills and
 * mountains at the rim. Water fills channels scoured along the foot of the
 * walls (see water.ts), with layered fog sheets drifting above.
 */
import * as THREE from 'three';

/* ───────── Noise ───────── */
export const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
export const fbm = (x: number, y: number, oct = 5) => {
  let v = 0;
  let a = 0.5;
  for (let i = 0; i < oct; i++) {
    v += a * noise(x, y);
    x = x * 2.03 + 17;
    y = y * 2.03 + 17;
    a *= 0.5;
  }
  return v;
};
/** Ridged fbm: sharp crests for the mountains */
const ridged = (x: number, y: number) => {
  let v = 0;
  let a = 0.5;
  for (let i = 0; i < 5; i++) {
    v += a * (1 - Math.abs(noise(x, y) * 2 - 1)) ** 2;
    x = x * 2.1 + 11;
    y = y * 2.1 + 11;
    a *= 0.5;
  }
  return v;
};
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const deg = Math.PI / 180;
/** Unsigned angle between two directions, radians */
const angDist = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/* ───────── Labyrinth ───────── */
const RINGS = [
  // Wall footprint ≈ 2.4 w, ring spacing 18: walls and channels come out roughly equal in width
  { r: 9, h: 6, w: 2.6, gaps: [90] },
  { r: 18, h: 9, w: 3.4, gaps: [270] },
  { r: 36, h: 11, w: 4, gaps: [60, 200] },
  { r: 54, h: 12, w: 4.2, gaps: [130, 330] },
  { r: 72, h: 13, w: 4.4, gaps: [20, 250] },
];
const WALLS = [
  { a: 150, r0: 18, r1: 36, h: 8, w: 3 },
  { a: 80, r0: 36, r1: 54, h: 9, w: 3.2 },
  { a: 290, r0: 36, r1: 54, h: 9, w: 3.2 },
  { a: 180, r0: 54, r1: 72, h: 10, w: 3.4 },
];
/** Wall cross-section: broad rounded top, steep flanks (reads as eroded rock, not a bump) */
const wall = (d: number, w: number) => (1 - smoothstep(w * 0.3, w * 1.45, d)) * (1 - 0.15 * Math.min(1, (d / w) ** 2));

function maze(x: number, z: number, r0: number, a: number) {
  // Wobble the radius so the rings read as carved rock, not compass circles
  const r = r0 + (fbm(x * 0.025 + 40, z * 0.025 - 12, 3) - 0.5) * 8;
  let m = 0;
  for (const R of RINGS) {
    let p = R.h * wall(Math.abs(r - R.r), R.w);
    // Openings: ~14 units of arc, eased so the wall ends look worn
    const half = 7 / R.r;
    for (const g of R.gaps) p *= smoothstep(half * 0.55, half, angDist(a, g * deg));
    m = Math.max(m, p);
  }
  for (const W of WALLS) {
    const t = W.a * deg;
    const along = r * Math.cos(a - t);
    if (along < W.r0 - 4 || along > W.r1 + 4) continue;
    const across = r * Math.sin(a - t);
    m = Math.max(m, W.h * wall(Math.abs(across), W.w) * smoothstep(W.r0 - 4, W.r0, along) * smoothstep(W.r1 + 4, W.r1, along));
  }
  // Weather the walls: uneven crest heights plus fine rocky detail
  const rough = (fbm(x * 0.35, z * 0.35, 4) - 0.5) * 2.4 + (ridged(x * 0.12, z * 0.12) - 0.3) * 2.4;
  return m * (0.75 + 0.5 * fbm(x * 0.07, z * 0.07, 3)) + rough * Math.min(1, m / 3);
}

/** Surface of the water that fills the channels between the walls */
export const WATER = 0.2;

export function heightAt(x: number, z: number) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  let h = -1.4 + fbm(x * 0.03 + 3, z * 0.03 + 7) * 3;
  if (r < 96) {
    // Inside the maze: a shallow, nearly level bed so the channels flood continuously
    const bed = -1 + (fbm(x * 0.05 + 2, z * 0.05 - 5, 3) - 0.5) * 0.9;
    h += (bed + maze(x, z, r, a) - h) * (1 - smoothstep(84, 96, r));
  }
  // Rim: rolling hills, then ridged mountains far out
  // Kept low near the maze so the eye runs across the valley to a misty horizon
  // Mountains only across the back and far sides: none rising beside / behind the camera (+z)
  const back = smoothstep(70, -30, z);
  h += smoothstep(92, 170, r) * (3 + fbm(x * 0.02, z * 0.02) * 12) * (0.35 + 0.65 * back);
  h += smoothstep(150, 230, r) * ridged(x * 0.012 + 4, z * 0.012 + 9) * 60 * back;
  return h;
}

/* ───────── Shaders: drifting fog sheets ───────── */
export const noiseGlsl = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
// Three octaves: enough for soft, blurry media (smoke, glow) at a fraction of the cost
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v * 1.14;
}`;
const sheetVert = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const fogFrag = /* glsl */ `
uniform float uTime, uAlpha, uScale;
uniform vec3 uColor;
varying vec3 vW;
${noiseGlsl}
void main() {
  vec2 p = vW.xz * uScale;
  float n = fbm(p + vec2(uTime * 0.03, uTime * 0.015));
  float a = smoothstep(0.45, 0.9, n) * uAlpha * (1.0 - smoothstep(150.0, 260.0, length(vW.xz)));
  gl_FragColor = vec4(uColor, a);
}`;

/* ───────── Meshes ───────── */
/** Tileable rock grain for the bump map: periodic value noise, several octaves */
function rockBump() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const img = g.createImageData(S, S);
  const per = (x: number, y: number, p: number) => hash(((x % p) + p) % p, ((y % p) + p) % p);
  const pnoise = (x: number, y: number, p: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let fx = x - ix;
    let fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = per(ix, iy, p);
    const b = per(ix + 1, iy, p);
    const cc = per(ix, iy + 1, p);
    const d = per(ix + 1, iy + 1, p);
    return a + (b - a) * fx + (cc - a) * fy + (a - b - cc + d) * fx * fy;
  };
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let v = 0;
      let amp = 0.5;
      for (let o = 0, p = 8; o < 5; o++, p *= 2) {
        // Ridged octaves give cracked, stratified rock rather than soft blotches
        v += amp * (1 - Math.abs(pnoise((x / S) * p, (y / S) * p, p) * 2 - 1));
        amp *= 0.5;
      }
      const k = (y * S + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.min(255, v * 255);
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(52, 52);
  tex.anisotropy = 4;
  return tex;
}

function groundMesh(seg: number) {
  const HALF = 230;
  const geo = new THREE.PlaneGeometry(2, 2, seg, seg).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  // Pack vertices toward the middle (spacing ~0.5 in the maze, ~2 at the rim) for crisp wall detail
  const warp = (u: number) => Math.sign(u) * HALF * (0.42 * Math.abs(u) + 0.58 * u * u);
  for (let i = 0; i < pos.count; i++) {
    const x = warp(pos.getX(i));
    const z = warp(pos.getZ(i));
    pos.setXYZ(i, x, heightAt(x, z), z);
    // UVs follow world space so the bump grain has a constant scale
    uv.setXY(i, x / (2 * HALF) + 0.5, -z / (2 * HALF) + 0.5);
  }
  geo.computeVertexNormals();

  const n = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  // Labyrinth palette (from the reference): shadow → three rock blues → lit highlight
  const SHADOW = new THREE.Color('#142c47');
  const ROCK = new THREE.Color('#1d4f79');
  const ROCK_2 = new THREE.Color('#30628a');
  const HAZE = new THREE.Color('#4073a3');
  const LIT = new THREE.Color('#3573a5');
  const BANK = new THREE.Color('#163655');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = n.getY(i);
    const v = fbm(x * 0.2, z * 0.2, 3);
    // Steep faces stay in shadow; gentler ground picks up the rock blues
    col.copy(SHADOW).lerp(ROCK, smoothstep(0.55, 0.9, ny) * 0.9);
    col.lerp(ROCK_2, smoothstep(2, 9, y) * smoothstep(0.65, 0.92, ny) * 0.8);
    // Saturated lit blue on the upper wall flanks facing out of shadow
    col.lerp(LIT, smoothstep(4, 10, y) * smoothstep(0.35, 0.7, ny) * smoothstep(0.95, 0.75, ny) * 0.6);
    // Moonlit crests and the high ground fade toward the haze colour
    col.lerp(HAZE, smoothstep(7, 12, y) * smoothstep(0.7, 0.95, ny) * 0.55 + smoothstep(30, 70, y) * 0.4);
    // Wet, darker banks just above the waterline
    col.lerp(BANK, smoothstep(WATER + 1.4, WATER, y) * 0.8);
    col.multiplyScalar(0.82 + v * 0.36);
    col.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, bumpMap: rockBump(), bumpScale: 2.2 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildTerrain(seg: number) {
  const group = new THREE.Group();
  group.add(groundMesh(seg));
  const time = { value: 0 };

  // Two fog sheets at different heights and scales read as layered mist
  for (const [y, alpha, scale] of [
    [3, 0.26, 0.03],
    [9, 0.15, 0.018],
  ]) {
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520, 1, 1).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        vertexShader: sheetVert,
        fragmentShader: fogFrag,
        uniforms: { uTime: time, uAlpha: { value: alpha }, uScale: { value: scale }, uColor: { value: new THREE.Color('#33557f') } },
        transparent: true,
        depthWrite: false,
      })
    );
    sheet.position.y = y;
    sheet.renderOrder = 2;
    group.add(sheet);
  }

  return { group, tick: (t: number) => void (time.value = t) };
}
