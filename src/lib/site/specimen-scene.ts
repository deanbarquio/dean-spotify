import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Specimen 026-DB: a wireframe CRT monitor (navy) that is "dissected" on scroll —
 * bezel and housing split away to expose a magenta wireframe core on a white cable.
 * Fixed behind the whole page; after the hero it drifts to the side as a companion.
 */

type Options = {
  reducedMotion: boolean;
  onCoreClick?: () => void;
};

export type SpecimenScene = {
  ready: Promise<void>;
  /** 0 = intact monitor, 1 = fully dissected (hero scroll) */
  setDissect: (p: number) => void;
  /** 0 = centred hero framing, 1 = parked on the right as a companion */
  setPark: (p: number) => void;
  setTheme: (theme: 'light' | 'dark', instant?: boolean) => void;
  pulse: () => void;
  dispose: () => void;
};

const PALETTE = {
  dark: { bg: '#0a0907', navy: '#1f35d6', pink: '#ff006e', red: '#ff1a1a', white: '#f2ede4', lime: '#b8ff00', bloom: 0.5 },
  light: { bg: '#f2ede4', navy: '#1b2bb0', pink: '#e8005f', red: '#e01414', white: '#2a2622', lime: '#6c9a00', bloom: 0.15 },
};

export function createSpecimenScene(canvas: HTMLCanvasElement, opts: Options): SpecimenScene {
  const still = opts.reducedMotion ? 0 : 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.dark.bg);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 0.4, 18);

  const lineMat = (color: string, opacity = 0.9) =>
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const mats = {
    navy: lineMat(PALETTE.dark.navy, 0.85),
    navyDim: lineMat(PALETTE.dark.navy, 0.4),
    pink: lineMat(PALETTE.dark.pink, 0.95),
    red: lineMat(PALETTE.dark.red, 0.9),
    white: lineMat(PALETTE.dark.white, 0.9),
    lime: lineMat(PALETTE.dark.lime, 0.9),
  };
  const wire = (geo: THREE.BufferGeometry, mat: THREE.LineBasicMaterial) => {
    const w = new THREE.LineSegments(new THREE.WireframeGeometry(geo), mat);
    geo.dispose();
    return w;
  };

  const root = new THREE.Group();
  scene.add(root);
  const specimen = new THREE.Group();
  specimen.rotation.set(0.12, -0.55, 0);
  root.add(specimen);

  // ── Monitor: front bezel (with screen), tapered CRT housing, neck, base ──
  const bezel = new THREE.Group();
  const bezelFrame = wire(new THREE.BoxGeometry(6.2, 4.8, 0.7, 18, 14, 2), mats.navy);
  const screen = wire(new THREE.SphereGeometry(9, 22, 16, Math.PI * 0.5 - 0.27, 0.54, Math.PI * 0.5 - 0.2, 0.4), mats.navyDim);
  screen.position.z = -8.55;
  bezel.add(bezelFrame, screen);
  bezel.position.z = 1.6;

  const housingGeo = new THREE.CylinderGeometry(1.6, 3.6, 3.6, 4, 10, true);
  housingGeo.rotateY(Math.PI / 4);
  housingGeo.rotateX(Math.PI / 2);
  housingGeo.scale(1, 0.78, 1);
  const housing = wire(housingGeo, mats.navy);
  housing.position.z = -0.6;

  const neck = wire(new THREE.CylinderGeometry(0.6, 0.9, 1.4, 14, 4), mats.navy);
  neck.position.set(0, -3, -0.2);
  const base = wire(new THREE.BoxGeometry(4.2, 0.35, 2.8, 14, 1, 10), mats.navy);
  base.position.set(0, -3.8, -0.2);

  // Antennas: a playful nod, magenta
  const antennas = new THREE.Group();
  [-1, 1].forEach((s) => {
    const a = wire(new THREE.ConeGeometry(0.14, 3.4, 10, 8), mats.pink);
    a.position.set(s * 0.9, 3.9, -0.4);
    a.rotation.z = -s * 0.42;
    const tip = wire(new THREE.SphereGeometry(0.28, 12, 8), mats.pink);
    tip.position.set(s * 1.62, 5.45, -0.4);
    antennas.add(a, tip);
  });

  // ── The core: dense magenta knot (the "brain"), red node, white cable ──
  const core = new THREE.Group();
  const knot = wire(new THREE.TorusKnotGeometry(1.15, 0.42, 200, 18, 2, 3), mats.pink);
  const node = wire(new THREE.IcosahedronGeometry(0.7, 2), mats.red);
  node.position.set(-1.1, -0.9, 0.2);
  const cableGeo = new THREE.CylinderGeometry(0.16, 0.42, 3.4, 12, 10, true);
  const cable = wire(cableGeo, mats.white);
  cable.position.set(0.3, -2.4, 0);
  cable.rotation.z = -0.25;
  core.add(knot, node, cable);
  core.scale.setScalar(0.62);
  core.position.set(0, 0.1, -0.4);

  // Invisible hit target for clicking the core
  const coreHit = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  core.add(coreHit);

  // Debug pulse rings
  const ring = wire(new THREE.TorusGeometry(2.4, 0.02, 4, 90), mats.lime);
  ring.visible = false;
  core.add(ring);

  specimen.add(bezel, housing, neck, base, antennas, core);

  // Background dust: faint scanning points
  const dustGeo = new THREE.BufferGeometry();
  const dust = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) dust.set([(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 34, -10 - Math.random() * 30], i * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const dustMat = new THREE.PointsMaterial({ color: PALETTE.dark.white, size: 0.06, transparent: true, opacity: 0.35 });
  scene.add(new THREE.Points(dustGeo, dustMat));

  /* ───────── Post: bloom gives the wires their neon bleed ───────── */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), PALETTE.dark.bloom, 0.35, 0.25);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ───────── State ───────── */
  let dissect = 0;
  let park = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let portrait = false;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.9;
    camera.position.z = portrait ? 28 : 18;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const onMove = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // Click the core (only when exposed and not over page UI)
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const onClick = (e: MouseEvent) => {
    if (dissect < 0.6) return;
    if ((e.target as HTMLElement).closest('a, button, input, [data-no-specimen]')) return;
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(coreHit).length) {
      pulse();
      opts.onCoreClick?.();
    }
  };
  window.addEventListener('click', onClick);

  function pulse() {
    ring.visible = true;
    gsap.fromTo(ring.scale, { x: 0.3, y: 0.3, z: 0.3 }, { x: 2.2, y: 2.2, z: 2.2, duration: 0.9, ease: 'expo.out' });
    gsap.fromTo(mats.lime, { opacity: 1 }, { opacity: 0, duration: 0.9, ease: 'power2.in', onComplete: () => void (ring.visible = false) });
    gsap.fromTo(core.rotation, { z: 0 }, { z: Math.PI * 2, duration: 1.2, ease: 'expo.inOut' });
    gsap.fromTo(mats.pink, { opacity: 1 }, { opacity: 0.95, duration: 0.6, yoyo: true, repeat: 3, ease: 'steps(2)' });
  }

  /* ───────── Loop ───────── */
  let raf = 0;
  const t0 = performance.now();
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = (now - t0) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    const d = THREE.MathUtils.smootherstep(dissect, 0, 1);
    // Bezel swings off to the left, housing slides back and right, antennas lift
    bezel.position.set(-d * 7.5, d * 0.8, 1.6 + d * 2.5);
    bezel.rotation.set(d * 0.3, -d * 1.1, d * 0.25);
    housing.position.set(d * 7, -d * 0.6, -0.6 - d * 3);
    housing.rotation.set(-d * 0.2, d * 0.9, -d * 0.2);
    antennas.position.set(-d * 2, d * 4, 0);
    antennas.rotation.z = d * 0.5;
    neck.position.y = -3 - d * 2.6;
    base.position.y = -3.8 - d * 3.2;
    // Core rises and grows into the hero subject
    core.scale.setScalar(0.62 + d * 0.6);
    core.position.set(d * 0.4, 0.1 + d * 0.6, -0.4 + d * 0.9);
    knot.rotation.y = t * 0.35 * still;
    knot.rotation.x = Math.sin(t * 0.4) * 0.2 * still;
    node.rotation.y = -t * 0.5 * still;

    // Parked: drift right, shrink, fade the shell
    const pk = THREE.MathUtils.smootherstep(park, 0, 1);
    const offX = portrait ? 0 : 3.2;
    root.position.set(offX + pk * (portrait ? 0 : 5.5), -0.6 + pk * (portrait ? 3 : 0.8), -pk * 6);
    root.scale.setScalar(portrait ? 0.7 : 0.78);
    // Once parked, the detached shell fades out so only the core companion remains
    mats.navy.opacity = 0.85 * (1 - pk * 0.92);
    mats.navyDim.opacity = 0.4 * (1 - pk);
    bezel.visible = housing.visible = pk < 0.98;

    specimen.rotation.y = -0.55 + d * 0.45 + pointer.x * 0.25 * still + Math.sin(t * 0.25) * 0.08 * still;
    specimen.rotation.x = 0.12 - pointer.y * 0.12 * still;

    composer.render();
  }

  const ready = (async () => {
    renderer.compile(scene, camera);
    raf = requestAnimationFrame(frame);
  })();

  /* ───────── Theme ───────── */
  const themeState = { k: 1 };
  const tmp = { a: new THREE.Color(), b: new THREE.Color() };
  function applyTheme() {
    const k = themeState.k; // 1 = dark, 0 = light
    const mix = (key: keyof typeof PALETTE.dark) => tmp.a.set(PALETTE.light[key] as string).lerp(tmp.b.set(PALETTE.dark[key] as string), k);
    (scene.background as THREE.Color).copy(mix('bg'));
    mats.navy.color.copy(mix('navy'));
    mats.navyDim.color.copy(mix('navy'));
    mats.pink.color.copy(mix('pink'));
    mats.red.color.copy(mix('red'));
    mats.white.color.copy(mix('white'));
    mats.lime.color.copy(mix('lime'));
    dustMat.color.copy(mix('white'));
    bloom.strength = PALETTE.light.bloom + (PALETTE.dark.bloom - PALETTE.light.bloom) * k;
  }

  return {
    ready,
    setDissect: (p) => void (dissect = p),
    setPark: (p) => void (park = p),
    setTheme(name, instant) {
      gsap.to(themeState, { k: name === 'dark' ? 1 : 0, duration: instant ? 0 : 0.9, ease: 'power2.inOut', onUpdate: applyTheme });
    },
    pulse,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('click', onClick);
      scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      composer.dispose();
      renderer.dispose();
    },
  };
}
