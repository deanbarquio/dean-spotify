/**
 * Hero 3D stage: "Monkey DJ (Animated)" by Jungle Jim (CC-BY-4.0).
 * The model is used as authored (textures recompressed only) — no geometry changes.
 *
 * The camera is driven by a rig: `pan` (0→1) moves along the intro dolly path,
 * `scroll` (0→1) pushes in as the hero leaves the viewport.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const MODEL_URL = '/models/monkey-dj.glb';
const SET_WIDTH = 8; // normalised width of the whole booth + speakers
const BPM = 120;
const FOG_DENSITY = 0.055;
const GREEN = new THREE.Color('#1DB954');
const VIOLET = new THREE.Color('#8B5CF6');
const WARM = new THREE.Color('#FFE2B8');

export type HeroStage = {
  /** Resolves when the model is in the scene (rejects on load failure) */
  ready: Promise<void>;
  rig: { pan: number; scroll: number; reveal: number };
  dispose: () => void;
};

type StageOptions = {
  reducedMotion: boolean;
  onProgress?: (fraction: number) => void;
};

/** Soft additive light-cone shader (fake volumetric beam) */
function beamMaterial(color: THREE.Color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uColor: { value: color.clone() }, uOpacity: { value: 0.22 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float along = pow(vUv.y, 1.6);
        float core = pow(abs(dot(vNormal, vView)), 1.8);
        gl_FragColor = vec4(uColor, along * core * uOpacity);
      }
    `,
  });
}

export function createHeroStage(canvas: HTMLCanvasElement, opts: StageOptions): HeroStage {
  const { reducedMotion } = opts;
  const rig = { pan: reducedMotion ? 1 : 0, scroll: 0, reveal: reducedMotion ? 1 : 0 };

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050806, FOG_DENSITY);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200);

  // ── Lights (Spotify green + violet over a warm key) ──
  scene.add(new THREE.HemisphereLight(0x9fb8ff, 0x0b120d, 0.35));
  const key = new THREE.SpotLight(WARM, 90, 0, Math.PI / 6, 0.6, 2);
  const greenSpot = new THREE.SpotLight(GREEN, 140, 0, Math.PI / 7, 0.5, 2);
  const violetSpot = new THREE.SpotLight(VIOLET, 140, 0, Math.PI / 7, 0.5, 2);
  [key, greenSpot, violetSpot].forEach((l) => {
    scene.add(l, l.target);
  });

  // ── Stage dressing ──
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.55 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const beamGeo = new THREE.ConeGeometry(1, 1, 48, 1, true);
  beamGeo.translate(0, -0.5, 0); // apex at origin
  beamGeo.rotateX(-Math.PI / 2); // open end along +z, so lookAt() aims the beam
  const greenBeam = new THREE.Mesh(beamGeo, beamMaterial(GREEN));
  const violetBeam = new THREE.Mesh(beamGeo, beamMaterial(VIOLET));
  scene.add(greenBeam, violetBeam);

  // Spotify-style visualizer ring on the floor
  const BAR_COUNT = 72;
  const barGeo = new THREE.BoxGeometry(1, 1, 1);
  barGeo.translate(0, 0.5, 0);
  const bars = new THREE.InstancedMesh(barGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), BAR_COUNT);
  const barSeeds = Array.from({ length: BAR_COUNT }, () => Math.random());
  for (let i = 0; i < BAR_COUNT; i++) {
    bars.setColorAt(i, GREEN.clone().lerp(VIOLET, (Math.sin((i / BAR_COUNT) * Math.PI * 2) + 1) / 2));
  }
  scene.add(bars);

  // Dust drifting through the beams
  const DUST = 700;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ size: 0.022, color: 0xd8ffe6, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  scene.add(dust);

  // ── Shot layout (filled once the model's bounds are known) ──
  const M = new THREE.Vector3(); // monkey centre
  const Bc = new THREE.Vector3(); // booth centre
  const V = new THREE.Vector3(); // vinyl
  const f = new THREE.Vector3(0, 0, 1); // towards the audience
  const r = new THREE.Vector3(1, 0, 0); // camera right
  const up = new THREE.Vector3(0, 1, 0);
  let S = 1; // monkey height
  let D = 5; // final framing distance
  let posPath: THREE.CatmullRomCurve3 | null = null;
  let tgtPath: THREE.CatmullRomCurve3 | null = null;
  let ringRadius = 3;

  function buildShots() {
    const p = (...parts: [THREE.Vector3, number][]) => {
      const out = new THREE.Vector3();
      parts.forEach(([v, s]) => out.addScaledVector(v, s));
      return out;
    };
    D = (1.45 * S) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const finalPos = p([M, 1], [f, D], [up, 0.32 * S]);
    const half = SET_WIDTH / 2;

    // Macro on the vinyl → low dolly across the booth past a speaker → crane-up reveal → hero frame
    posPath = new THREE.CatmullRomCurve3(
      [
        p([V, 1], [f, 0.32 * S], [up, 0.1 * S], [r, -0.45 * S]),
        p([V, 1], [f, 0.7 * S], [up, 0.16 * S], [r, 0.4 * S]),
        p([Bc, 1], [f, 1.3 * S], [up, 0.22 * S], [r, half * 0.75]),
        p([Bc, 1], [f, 2.4 * S], [up, 0.9 * S], [r, half * 0.55]),
        finalPos,
      ],
      false,
      'centripetal'
    );
    tgtPath = new THREE.CatmullRomCurve3(
      [V.clone(), p([V, 1], [r, 0.3 * S]), p([Bc, 1], [up, 0.25 * S]), p([M, 1], [up, 0.05 * S]), M.clone()],
      false,
      'centripetal'
    );

    // Lights hang above the booth, aimed at the DJ
    key.position.copy(p([M, 1], [f, 3 * S], [up, 3 * S], [r, 1.2 * S]));
    key.target.position.copy(M);
    greenSpot.position.copy(p([Bc, 1], [f, -1.5 * S], [up, 3.2 * S], [r, -half * 0.6]));
    violetSpot.position.copy(p([Bc, 1], [f, -1.5 * S], [up, 3.2 * S], [r, half * 0.6]));

    ringRadius = half * 0.95;
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = Bc.x + (Math.random() - 0.5) * SET_WIDTH * 1.4;
      dustPos[i * 3 + 1] = Math.random() * S * 3.5;
      dustPos[i * 3 + 2] = Bc.z + (Math.random() - 0.5) * SET_WIDTH;
    }
    dustGeo.attributes.position.needsUpdate = true;
  }

  // ── Model ──
  let mixer: THREE.AnimationMixer | null = null;
  let resolveReady!: () => void;
  let rejectReady!: (e: unknown) => void;
  const ready = new Promise<void>((res, rej) => {
    resolveReady = res;
    rejectReady = rej;
  });
  ready.catch(() => {});

  new GLTFLoader().load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const skinned: THREE.Object3D[] = [];
      const vinyls: THREE.Object3D[] = [];

      model.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.frustumCulled = false; // skinned bounds don't follow the animation
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(mesh);
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
        mats.forEach((m) => {
          if (/vinyl/i.test(m.name)) vinyls.push(mesh);
          [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.emissiveMap].forEach((t) => {
            if (t) t.anisotropy = maxAniso;
          });
        });
      });

      // Rigid normalisation only: uniform scale + translate onto the floor
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => mixer!.clipAction(clip).play());
      mixer.update(0);
      model.updateMatrixWorld(true);
      const whole = new THREE.Box3().setFromObject(model);
      const size = whole.getSize(new THREE.Vector3());
      const scale = SET_WIDTH / Math.max(size.x, size.z);
      model.scale.setScalar(scale);
      const c = whole.getCenter(new THREE.Vector3());
      model.position.set(-c.x * scale, -whole.min.y * scale, -c.z * scale);
      scene.add(model);
      model.updateMatrixWorld(true);

      const boxOf = (objs: THREE.Object3D[]) => {
        const b = new THREE.Box3();
        objs.forEach((o) => b.expandByObject(o));
        return b;
      };
      const all = new THREE.Box3().setFromObject(model);
      const monkey = skinned.length ? boxOf(skinned) : all;
      monkey.getCenter(M);
      S = Math.max(0.5, monkey.getSize(new THREE.Vector3()).y);
      all.getCenter(Bc);
      Bc.y = M.y - S * 0.25;
      if (vinyls.length) boxOf(vinyls).getCenter(V);
      else V.copy(Bc);

      // The DJ stands behind the decks: the audience is on the far side of the booth from the monkey
      const decks = vinyls.length ? V.clone() : Bc.clone();
      f.set(decks.x - M.x, 0, decks.z - M.z);
      if (f.lengthSq() < 1e-6) f.set(0, 0, 1);
      f.normalize();
      // Camera looks along -f, so screen-right is up × f
      r.crossVectors(up, f).normalize();

      buildShots();
      resolveReady();
    },
    (e) => {
      if (e.total) opts.onProgress?.(e.loaded / e.total);
    },
    (err) => rejectReady(err)
  );

  // ── Pointer parallax ──
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // ── Sizing ──
  let w = 1;
  let h = 1;
  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
    root: document.getElementById('main-scroll'),
    threshold: 0,
  });
  io.observe(canvas);

  // ── Loop ──
  const timer = new THREE.Timer();
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  let t = 0;
  let raf = 0;

  function frame(time?: number) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.1);
    t += dt;
    mixer?.update(dt);

    const beatPhase = reducedMotion ? 0.5 : (t * BPM) / 60 % 1;
    const beat = reducedMotion ? 0.3 : Math.exp(-beatPhase * 5);

    if (posPath && tgtPath) {
      const pan = THREE.MathUtils.clamp(rig.pan, 0, 1);
      posPath.getPoint(pan, camPos);
      tgtPath.getPoint(pan, camTgt);

      // Settled: slow orbit drift + breathing dolly + pointer parallax
      const settle = THREE.MathUtils.smoothstep(pan, 0.85, 1);
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 3);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 3);
      if (settle > 0) {
        const drift = reducedMotion ? 0 : Math.sin(t * 0.18) * 0.1;
        const yaw = (drift + pointer.sx * 0.22) * settle;
        tmp.copy(camPos).sub(M).applyAxisAngle(up, yaw);
        camPos.copy(M).add(tmp);
        camPos.addScaledVector(up, -pointer.sy * 0.25 * S * settle);
        if (!reducedMotion) camPos.addScaledVector(f, Math.sin(t * 0.4) * 0.05 * S * settle);
      }

      // Scroll: push in over the decks and rise
      const sc = THREE.MathUtils.clamp(rig.scroll, 0, 1);
      if (sc > 0) {
        tmp.copy(V).addScaledVector(f, 0.9 * S).addScaledVector(up, 0.8 * S);
        camPos.lerp(tmp, sc * 0.65);
        camTgt.lerp(V, sc * 0.5);
      }

      // Narrow/portrait screens: back off until the DJ + decks fit the horizontal field of view
      const wide = w / h > 1.15 && w > 700;
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      const fitW = (1.25 * S) / (tanH * D);
      const backOff = fitW > 1 ? 1 + (fitW - 1) * settle : 1;
      if (backOff > 1) {
        tmp.copy(camPos).sub(M).multiplyScalar(backOff);
        camPos.copy(M).add(tmp);
      }
      // Keep the same haze on the subject however far the camera sits
      (scene.fog as THREE.FogExp2).density = FOG_DENSITY / backOff;

      camera.position.copy(camPos);
      camera.lookAt(camTgt);

      // Lens shift: wide screens park the DJ right of centre (copy on the left);
      // portrait screens lift the DJ into the top third (copy below)
      const shift = (wide ? 0.42 : 0.55) * settle * (1 - sc * 0.6);
      if (shift > 0.001) {
        if (wide) camera.setViewOffset(w * (1 + shift), h, 0, 0, w, h);
        else camera.setViewOffset(w, h * (1 + shift), 0, h * shift, w, h);
      } else camera.clearViewOffset();
    }

    // Lights: pulse on the beat, beams sweep the room
    const sweep = reducedMotion ? 0 : t * 0.6;
    const dim = 1 - THREE.MathUtils.clamp(rig.scroll, 0, 1) * 0.5;
    greenSpot.intensity = (90 + 110 * beat) * dim * rig.reveal;
    violetSpot.intensity = (90 + 110 * beat) * dim * rig.reveal;
    key.intensity = 70 + 20 * rig.reveal;
    greenSpot.target.position.copy(M).addScaledVector(r, Math.sin(sweep) * 1.4 * S).addScaledVector(f, Math.cos(sweep * 0.7) * S);
    violetSpot.target.position.copy(M).addScaledVector(r, -Math.sin(sweep + 1.3) * 1.4 * S).addScaledVector(f, Math.cos(sweep * 0.8 + 2) * S);

    [
      [greenBeam, greenSpot],
      [violetBeam, violetSpot],
    ].forEach(([beam, spot]) => {
      const b = beam as THREE.Mesh;
      const s = spot as THREE.SpotLight;
      const len = s.position.distanceTo(s.target.position) * 1.15;
      const radius = Math.tan(s.angle) * len;
      b.position.copy(s.position);
      b.scale.set(radius, radius, len);
      b.lookAt(s.target.position);
      (b.material as THREE.ShaderMaterial).uniforms.uOpacity.value = (0.12 + 0.18 * beat) * rig.reveal * dim;
    });

    // Visualizer arc behind the booth (never between the camera and the copy)
    for (let i = 0; i < BAR_COUNT; i++) {
      const a = (i / (BAR_COUNT - 1)) * Math.PI;
      const wave = reducedMotion ? 0.3 : 0.5 + 0.5 * Math.sin(t * 3 + i * 0.45 + barSeeds[i] * 6);
      const height = (0.06 + (0.2 + 0.9 * beat) * wave * (0.4 + barSeeds[i])) * S * rig.reveal;
      dummy.position
        .copy(Bc)
        .addScaledVector(r, Math.cos(a) * ringRadius)
        .addScaledVector(f, -Math.sin(a) * ringRadius * 0.55 - 0.6 * S);
      dummy.position.y = 0;
      dummy.scale.set(0.035 * S, Math.max(0.001, height), 0.035 * S);
      dummy.updateMatrix();
      bars.setMatrixAt(i, dummy.matrix);
    }
    bars.instanceMatrix.needsUpdate = true;

    if (!reducedMotion) {
      for (let i = 0; i < DUST; i++) {
        dustPos[i * 3 + 1] += dt * 0.04 * (0.5 + (i % 7) / 7);
        if (dustPos[i * 3 + 1] > S * 3.5) dustPos[i * 3 + 1] = 0;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  frame();

  return {
    ready,
    rig,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      resizeObserver.disconnect();
      io.disconnect();
      mixer?.stopAllAction();
      timer.dispose();
      envTex.dispose();
      renderer.dispose();
    },
  };
}
