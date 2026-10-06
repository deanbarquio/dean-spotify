/**
 * Liquid Glass surfaces for every `.glass` element.
 *
 * - Refraction: a per-element SVG displacement map (bevel lens along the
 *   rounded edge, neutral centre) used as `backdrop-filter: url(#…)`, with
 *   a slight per-channel split for chromatic fringing. Chromium only;
 *   other engines keep the CSS blur + saturate fallback.
 * - Specular: the rim gradient and a soft reflection follow the pointer
 *   (mouse or touch) via --lg-angle / --lg-x / --lg-y / --lg-glow.
 * - Depth: [data-tilt] cards lean toward the pointer.
 */
import gsap from 'gsap';

const SVG_NS = 'http://www.w3.org/2000/svg';

const supportsRefraction = () => {
  const brands = (navigator as any).userAgentData?.brands as { brand: string }[] | undefined;
  if (brands) return brands.some((b) => /Chromium/.test(b.brand));
  // Chromium-based UAs carry "Chrome/"; iOS Chrome (WebKit) reports "CriOS/" instead
  return /Chrome\//.test(navigator.userAgent);
};

/** Displacement map: R/G encode the inward edge normal scaled by a convex bevel profile */
function displacementMap(w: number, h: number, radius: number, bezel: number) {
  const s = 0.5; // half-res map, upscaled by feImage
  const cw = Math.max(2, Math.round(w * s));
  const ch = Math.max(2, Math.round(h * s));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(cw, ch);
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      const px = (i + 0.5) / s - hw;
      const py = (j + 0.5) / s - hh;
      // Rounded-rect SDF and its outward normal
      const qx = Math.abs(px) - (hw - r);
      const qy = Math.abs(py) - (hh - r);
      let nx: number;
      let ny: number;
      let dist: number;
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy) || 1;
        nx = qx / l;
        ny = qy / l;
        dist = l - r;
      } else if (qx > qy) {
        nx = 1;
        ny = 0;
        dist = qx - r;
      } else {
        nx = 0;
        ny = 1;
        dist = qy - r;
      }
      nx *= Math.sign(px) || 1;
      ny *= Math.sign(py) || 1;
      const inside = -dist; // px from the edge, inward
      let mag = 0;
      if (inside > 0 && inside < bezel) {
        const t = 1 - inside / bezel;
        mag = t * t * (3 - 2 * t) * 0.9 + t * 0.1; // smooth convex lens
      }
      const k = (j * cw + i) * 4;
      // Sample from further inside the shape: displacement points inward
      img.data[k] = 128 - nx * mag * 127;
      img.data[k + 1] = 128 - ny * mag * 127;
      img.data[k + 2] = 128;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>) {
  const node = document.createElementNS(SVG_NS, name);
  for (const k in attrs) node.setAttribute(k, String(attrs[k]));
  return node;
}

/** Three displaced copies (R, G, B at slightly different strengths) screened back together */
function buildFilter(id: string, w: number, h: number, map: string, scale: number) {
  const f = el('filter', {
    id,
    x: 0,
    y: 0,
    width: w,
    height: h,
    filterUnits: 'userSpaceOnUse',
    primitiveUnits: 'userSpaceOnUse',
    'color-interpolation-filters': 'sRGB',
  });
  f.append(el('feImage', { href: map, x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'map' }));
  const channels: [string, number, string][] = [
    ['r', scale, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['g', scale * 1.05, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['b', scale * 1.1, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'],
  ];
  channels.forEach(([c, s, m]) => {
    f.append(el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: s, xChannelSelector: 'R', yChannelSelector: 'G', result: `d${c}` }));
    f.append(el('feColorMatrix', { in: `d${c}`, type: 'matrix', values: m, result: `c${c}` }));
  });
  f.append(el('feBlend', { in: 'cr', in2: 'cg', mode: 'screen', result: 'rg' }));
  f.append(el('feBlend', { in: 'rg', in2: 'cb', mode: 'screen' }));
  return f;
}

export function initLiquidGlass({ reducedMotion = false } = {}) {
  const surfaces = [...document.querySelectorAll<HTMLElement>('.glass')];
  if (!surfaces.length) return () => {};

  /* Refraction filters */
  let defs: SVGDefsElement | null = null;
  let ro: ResizeObserver | null = null;
  if (supportsRefraction()) {
    const svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    defs = el('defs', {});
    svg.append(defs);
    document.body.append(svg);
    document.documentElement.classList.add('lg-refract');

    const sizes = new WeakMap<HTMLElement, string>();
    const update = (node: HTMLElement, i: number) => {
      const w = Math.round(node.offsetWidth);
      const h = Math.round(node.offsetHeight);
      if (w < 4 || h < 4) return;
      const key = `${w}x${h}`;
      if (sizes.get(node) === key) return;
      sizes.set(node, key);
      const radius = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
      const bezel = Math.min(parseFloat(node.dataset.bezel ?? '') || 22, Math.min(w, h) / 2.5);
      const id = `lg-${i}`;
      defs!.querySelector(`#${id}`)?.remove();
      defs!.append(buildFilter(id, w, h, displacementMap(w, h, radius, bezel), Number(node.dataset.refract ?? 34)));
      node.style.setProperty('--lg-filter', `url(#${id})`);
    };
    ro = new ResizeObserver((entries) => entries.forEach((e) => update(e.target as HTMLElement, surfaces.indexOf(e.target as HTMLElement))));
    surfaces.forEach((s, i) => {
      update(s, i);
      ro!.observe(s);
    });
  }

  /* Specular tracking: every surface reacts to the pointer, near or over it */
  let px = window.innerWidth * 0.3;
  let py = -200;
  let queued = false;
  const paint = () => {
    queued = false;
    surfaces.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const angle = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
      const dist = Math.hypot(Math.max(r.left - px, 0, px - r.right), Math.max(r.top - py, 0, py - r.bottom));
      s.style.setProperty('--lg-angle', `${angle.toFixed(1)}deg`);
      s.style.setProperty('--lg-x', `${(((px - r.left) / r.width) * 100).toFixed(1)}%`);
      s.style.setProperty('--lg-y', `${(((py - r.top) / r.height) * 100).toFixed(1)}%`);
      s.style.setProperty('--lg-glow', Math.max(0, 1 - dist / 320).toFixed(3));
    });
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(paint);
    }
  };
  const onPointer = (e: PointerEvent) => {
    px = e.clientX;
    py = e.clientY;
    queue();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  window.addEventListener('scroll', queue, { passive: true });
  paint();

  /* Depth: tilt toward the pointer, spring back on leave */
  const offs: (() => void)[] = [];
  if (!reducedMotion) {
    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
      const max = Number(card.dataset.tilt) || 6;
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      const z = gsap.quickTo(card, 'z', { duration: 0.6, ease: 'power3.out' });
      gsap.set(card, { transformPerspective: 900 });
      const move = (e: PointerEvent) => {
        const r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        rx(-ny * max);
        ry(nx * max);
        z(18);
      };
      const leave = () => {
        rx(0);
        ry(0);
        z(0);
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      card.addEventListener('pointercancel', leave);
      offs.push(() => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
        card.removeEventListener('pointercancel', leave);
      });
    });
  }

  return () => {
    ro?.disconnect();
    defs?.parentElement?.remove();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('scroll', queue);
    offs.forEach((f) => f());
  };
}
