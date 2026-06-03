import * as THREE from 'three';

export type SkillsThreeHandle = {
  dispose: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Floating wireframe orbs + particles for Skills hero */
export function initSkillsHeroCanvas(canvas: HTMLCanvasElement): SkillsThreeHandle | null {
  if (prefersReducedMotion()) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 6;

  const group = new THREE.Group();
  scene.add(group);

  const accents = [0x3b82f6, 0x06b6d4, 0xf97316, 0x8b5cf6, 0x1db954];
  const shapes = [
    new THREE.IcosahedronGeometry(0.55, 0),
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.TorusGeometry(0.4, 0.12, 8, 20),
    new THREE.TetrahedronGeometry(0.5, 0),
  ];

  shapes.forEach((geo, i) => {
    const color = accents[i % accents.length];
    const mat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const angle = (i / shapes.length) * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * 1.8, Math.sin(angle) * 0.6, Math.sin(angle) * 0.8);
    mesh.userData.phase = i * 1.2;
    group.add(mesh);
  });

  const particleCount = 400;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      size: 0.04,
      color: 0x1db954,
      transparent: true,
      opacity: 0.5,
    })
  );
  scene.add(particles);

  let mouseX = 0;
  let mouseY = 0;
  const onMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
    mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
  };
  canvas.closest('.sk-hero')?.addEventListener('mousemove', onMove);

  let w = 0;
  let h = 0;
  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === w && height === h) return;
    w = width;
    h = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height || 1;
    camera.updateProjectionMatrix();
  };

  let frameId = 0;
  let t = 0;
  const animate = () => {
    frameId = requestAnimationFrame(animate);
    resize();
    t += 0.008;
    group.rotation.y = t * 0.4 + mouseX;
    group.rotation.x = mouseY * 0.3;
    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const phase = (mesh.userData.phase as number) ?? 0;
      mesh.rotation.x = t + phase;
      mesh.rotation.z = t * 0.5 + phase * 0.5;
      mesh.position.y += Math.sin(t * 2 + phase) * 0.002;
    });
    particles.rotation.y = t * 0.15;
    renderer.render(scene, camera);
  };
  resize();
  animate();

  const onWindowResize = () => resize();
  window.addEventListener('resize', onWindowResize);

  return {
    dispose: () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onWindowResize);
      canvas.closest('.sk-hero')?.removeEventListener('mousemove', onMove);
      renderer.dispose();
      pGeo.dispose();
      group.children.forEach((c) => {
        const m = c as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      particles.geometry.dispose();
      (particles.material as THREE.Material).dispose();
    },
  };
}
