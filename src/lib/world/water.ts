/**
 * Channel water: one plane at WATER, shaded per pixel from a baked terrain
 * heightmap so it knows how deep it is. Depth drives the colour (luminous
 * shallows, dark pools), a soft alpha edge and shoreline foam. The surface is
 * displaced by rolling swells plus rings spreading from each beacon; its slope
 * (and a fine noise chop) drives Fresnel sky reflection, a moon glint and pale
 * crests; each beacon leaves a coloured streak reflected toward the viewer.
 */
import * as THREE from 'three';
import { heightAt, noiseGlsl, WATER } from './terrain';

const EXTENT = 110; // heightmap covers ±EXTENT on x and z
const RES = 256;
const MAX_BEACONS = 16;

function heightTexture() {
  const data = new Uint16Array(RES * RES);
  for (let j = 0; j < RES; j++)
    for (let i = 0; i < RES; i++) {
      const x = (i / (RES - 1)) * 2 * EXTENT - EXTENT;
      const z = (j / (RES - 1)) * 2 * EXTENT - EXTENT;
      data[j * RES + i] = THREE.DataUtils.toHalfFloat(heightAt(x, z));
    }
  const tex = new THREE.DataTexture(data, RES, RES, THREE.RedFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Shared by both stages: rolling directional swells plus rings spreading out from each beacon */
const wavesGlsl = /* glsl */ `
uniform float uTime, uAmp;
uniform vec3 uBeaconPos[${MAX_BEACONS}];
uniform int uCount;
float swell(vec2 p) {
  float t = uTime;
  float h = sin(dot(p, vec2(0.82, 0.57)) * 0.55 + t * 1.1) * 0.5
          + sin(dot(p, vec2(-0.4, 0.92)) * 0.8 + t * 1.45) * 0.3
          + sin(dot(p, vec2(0.96, -0.28)) * 1.35 + t * 2.0) * 0.16
          + sin(dot(p, vec2(-0.7, -0.71)) * 2.1 + t * 2.6) * 0.08;
  return h;
}
float rings(vec2 p) {
  float r = 0.0;
  for (int i = 0; i < ${MAX_BEACONS}; i++) {
    if (i >= uCount) break;
    float d = length(p - uBeaconPos[i].xz);
    r += sin(d * 2.4 - uTime * 3.0) * exp(-d * 0.22) * smoothstep(0.6, 2.0, d);
  }
  return r;
}
float surface(vec2 p) { return (swell(p) + rings(p) * 0.6) * uAmp; }
// Analytic slope (d/dx, d/dz) of surface(): one pass instead of three finite-difference evaluations
vec2 slope(vec2 p) {
  float t = uTime;
  vec2 g = vec2(0.82, 0.57) * 0.55 * cos(dot(p, vec2(0.82, 0.57)) * 0.55 + t * 1.1) * 0.5
         + vec2(-0.4, 0.92) * 0.8 * cos(dot(p, vec2(-0.4, 0.92)) * 0.8 + t * 1.45) * 0.3
         + vec2(0.96, -0.28) * 1.35 * cos(dot(p, vec2(0.96, -0.28)) * 1.35 + t * 2.0) * 0.16
         + vec2(-0.7, -0.71) * 2.1 * cos(dot(p, vec2(-0.7, -0.71)) * 2.1 + t * 2.6) * 0.08;
  for (int i = 0; i < ${MAX_BEACONS}; i++) {
    if (i >= uCount) break;
    vec2 v = p - uBeaconPos[i].xz;
    float d = max(length(v), 1e-3);
    float ph = d * 2.4 - uTime * 3.0;
    float e = exp(-d * 0.22) * smoothstep(0.6, 2.0, d);
    g += (v / d) * (2.4 * cos(ph) - 0.22 * sin(ph)) * e * 0.6;
  }
  return g * uAmp;
}`;

const vert = /* glsl */ `
varying vec3 vW;
varying float vH;
${wavesGlsl}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vH = surface(w.xz);
  w.y += vH;
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const frag = /* glsl */ `
uniform sampler2D tHeight;
uniform float uExtent, uWater, uFogDensity;
uniform vec3 uDeep, uBody, uShallow, uFoam, uSkyTop, uSkyHorizon, uMoonDir, uMoonCol, uFogColor;
uniform vec3 uBeaconCol[${MAX_BEACONS}];
varying vec3 vW;
varying float vH;
${noiseGlsl}
${wavesGlsl}
// Fine chop on top of the geometric swell, normal-only
float chop(vec2 p) {
  return noise(p * 0.9 + vec2(uTime * 0.3, uTime * 0.2)) * 0.6 + noise(p * 2.2 - vec2(uTime * 0.45, -uTime * 0.35)) * 0.4;
}
void main() {
  float ground = texture2D(tHeight, vW.xz / (2.0 * uExtent) + 0.5).r;
  float depth = uWater - ground;
  // Water belongs to the maze channels only; low ground outside stays dry
  float inside = 1.0 - smoothstep(80.0, 86.0, length(vW.xz));
  if (depth <= 0.0 || inside <= 0.0) discard;

  // Normal: exact slope of the displaced swell, plus a little fine chop
  float e = 0.12;
  float c0 = chop(vW.xz);
  vec2 g = slope(vW.xz) + vec2(chop(vW.xz + vec2(e, 0.0)) - c0, chop(vW.xz + vec2(0.0, e)) - c0) * 0.05 / e;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = normalize(cameraPosition - vW);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  vec3 R = reflect(-V, n);
  vec3 sky = mix(uSkyHorizon, uSkyTop, smoothstep(0.0, 0.6, R.y));
  float glint = pow(max(dot(R, uMoonDir), 0.0), 90.0);

  // Body colour by depth: luminous shallows → rock blue → dark pools
  // Night water: dark body, a faint luminous edge in the shallows, moonlit sheen from reflection
  vec3 body = mix(uShallow * 0.55, uBody * 0.7, smoothstep(0.05, 0.8, depth));
  body = mix(body, uDeep * 0.8, smoothstep(0.8, 2.5, depth));
  vec3 col = mix(body, sky, fres * 0.6) + uMoonCol * glint * 0.7;
  // Moonlit crests: the tops of the swells catch a pale rim
  col += uFoam * smoothstep(0.55, 0.9, vH / max(uAmp, 1e-3)) * 0.12;
  // Low mist breathing on the surface: broad pale patches drifting slowly
  float haze = smoothstep(0.4, 0.9, noise(vW.xz * 0.06 + vec2(uTime * 0.03, uTime * 0.02)) * 0.65 + noise(vW.xz * 0.15 - uTime * 0.04) * 0.35);
  col = mix(col, uShallow * 0.6, haze * 0.18);

  // Beacon reflections: soft streaks stretched toward the camera, broken up by the ripples
  for (int i = 0; i < ${MAX_BEACONS}; i++) {
    if (i >= uCount) break;
    vec2 d = vW.xz - uBeaconPos[i].xz;
    vec2 toCam = normalize(cameraPosition.xz - uBeaconPos[i].xz + 1e-4);
    float along = dot(d, toCam);
    float across = dot(d, vec2(-toCam.y, toCam.x));
    float s = exp(-across * across / 2.5 - along * along / (along > 0.0 ? 70.0 : 6.0));
    col += uBeaconCol[i] * s * (0.45 + 0.55 * noise(vW.xz * 2.2 + uTime));
  }

  // Shoreline foam and a soft edge instead of a hard waterline
  float foam = smoothstep(0.35, 0.0, depth) * smoothstep(0.4, 0.8, noise(vW.xz * 1.6 + uTime * 0.3) + 0.3);
  col = mix(col, uFoam, foam * 0.3);
  float alpha = smoothstep(0.0, 0.18, depth) * inside;

  float dist = length(cameraPosition - vW);
  col = mix(col, uFogColor, 1.0 - exp(-uFogDensity * uFogDensity * dist * dist));
  gl_FragColor = vec4(col, alpha);
}`;

type Opts = {
  beacons: { pos: THREE.Vector3; color: THREE.Color }[];
  moonDir: THREE.Vector3;
  fog: THREE.FogExp2;
  sky: { top: string; horizon: string };
};

export function buildWater({ beacons, moonDir, fog, sky }: Opts) {
  const pos = Array.from({ length: MAX_BEACONS }, (_, i) => beacons[i]?.pos.clone() ?? new THREE.Vector3());
  const col = Array.from({ length: MAX_BEACONS }, (_, i) => beacons[i]?.color.clone().multiplyScalar(0.9) ?? new THREE.Color(0, 0, 0));
  const time = { value: 0 };
  const mesh = new THREE.Mesh(
    // ~0.75-unit grid so the swell is real geometry, not just shading
    new THREE.PlaneGeometry(EXTENT * 2, EXTENT * 2, 290, 290).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        tHeight: { value: heightTexture() },
        uExtent: { value: EXTENT },
        uWater: { value: WATER },
        uTime: time,
        uAmp: { value: 0.16 },
        uDeep: { value: new THREE.Color('#13233e') },
        uBody: { value: new THREE.Color('#21496a') },
        uShallow: { value: new THREE.Color('#6ea3df') },
        uFoam: { value: new THREE.Color('#bcdcf7') },
        uSkyTop: { value: new THREE.Color(sky.top) },
        uSkyHorizon: { value: new THREE.Color(sky.horizon) },
        uMoonDir: { value: moonDir.clone().normalize() },
        uMoonCol: { value: new THREE.Color('#d6e6ff') },
        uFogColor: { value: fog.color },
        uFogDensity: { value: fog.density },
        uBeaconPos: { value: pos },
        uBeaconCol: { value: col },
        uCount: { value: Math.min(beacons.length, MAX_BEACONS) },
      },
      transparent: true,
      depthWrite: false,
    })
  );
  mesh.position.y = WATER;
  mesh.renderOrder = 1;
  return { mesh, tick: (t: number) => void (time.value = t) };
}
