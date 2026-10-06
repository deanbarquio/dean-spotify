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
import { noiseGlsl } from './terrain';

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
  group.add(shell, beam, light, portal);
  group.visible = false;
  return { group, shell, beam, light, portal, portalU, color, u: shared };
}

/* ───────── Phoenix ───────── */
type Bird = { model: THREE.Group; mixer: THREE.AnimationMixer };

async function loadPhoenix(url: string): Promise<Bird> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  // The model's head points down +x: turn it so it flies along +z (what lookAt aims)
  model.rotation.y = -Math.PI / 2;
  const fire = new THREE.Color('#ff8a2a');
  model.traverse((o) => {
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

type GuardianOpts = { reducedMotion: boolean; renderer: THREE.WebGLRenderer; camera: THREE.Camera };

export function buildGuardian(scene: THREE.Scene, { reducedMotion, renderer, camera }: GuardianOpts) {
  const orb = buildOrb();
  scene.add(orb.group);
  // Root and its fire light join the scene up front: the light count never changes later,
  // so no material in the scene has to recompile when the model arrives
  const root = new THREE.Group();
  const fireLight = new THREE.PointLight('#ff9a40', 0, 40, 1.6);
  root.add(fireLight);
  scene.add(root);
  // Compile the orb and beam now rather than on the first click
  orb.group.visible = true;
  renderer.compile(scene, camera);
  orb.group.visible = false;

  let bird: Bird | null = null;
  loadPhoenix('/phoenix_bird.glb')
    .then(async (b) => {
      // Compile its shaders in the background (parallel compile) before it appears
      await renderer.compileAsync(b.model, camera, scene);
      root.add(b.model);
      bird = b;
    })
    .catch((err) => console.warn('Phoenix failed to load', err));

  let target: THREE.Vector3 | null = null; // focused beacon base
  let dive = 0;
  let portalImage: string | null = null;
  const loader = new THREE.TextureLoader();
  const textures = new Map<string, Promise<THREE.Texture>>();
  const texture = (url: string) => {
    let p = textures.get(url);
    if (!p) {
      p = loader.loadAsync(url).then((tex) => {
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

  return {
    /** Point the orb (and the phoenix) at a beacon, or release with null; `image` fills the portal */
    focus(base: THREE.Vector3 | null, color?: THREE.Color, image?: string) {
      if (base) {
        target = base.clone();
        orb.group.position.copy(base);
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
        // Guard duty: a lazy figure-eight kept inside the labyrinth's outer wall (r ≈ 72)
        const a = s * 0.11;
        return out.set(Math.sin(a) * 50, 32 + Math.sin(s * 0.3) * 5, Math.sin(a * 2) * 32 - 6);
      };
      at(t, want);
      // Ease toward the path so switching between patrol and orbit is a swoop, not a jump
      pos.lerp(want, 1 - Math.exp(-dt * (target ? 1.4 : 0.8)));
      at(t + 0.4, ahead);
      root.position.copy(pos);
      vel.subVectors(pos, prev);
      prev.copy(pos);
      if (vel.lengthSq() > 1e-6) {
        vel.normalize();
        root.lookAt(look.copy(pos).add(vel).lerp(ahead, 0.1));
        // Bank into turns
        const turn = bank.copy(vel).cross(look.subVectors(ahead, pos).normalize()).y;
        root.rotateZ(THREE.MathUtils.clamp(-turn * 2, -0.6, 0.6));
      }
      fireLight.intensity = 90 + Math.sin(t * 9) * 12;
    },
  };
}
