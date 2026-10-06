/**
 * Background dot field: a quiet grid of dots that swell and part around the cursor.
 * Redraws only while something is moving, so an idle page costs nothing.
 */
export type Field = { setColors: () => void; destroy: () => void };

export function createField(canvas: HTMLCanvasElement, { reducedMotion = false } = {}): Field {
  const ctx = canvas.getContext('2d')!;
  const GAP = 26;
  const RADIUS = 170;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let dim = 'rgba(0,0,0,.18)';
  let ink = 'rgba(0,0,0,1)';
  // Pointer target and eased position; strength fades in on move, out on leave
  const p = { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, ts: 0 };
  let raf = 0;

  const setColors = () => {
    const cs = getComputedStyle(document.documentElement);
    dim = cs.getPropertyValue('--l4').trim() || dim;
    ink = cs.getPropertyValue('--l2').trim() || ink;
    draw();
  };

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const ox = (w % GAP) / 2;
    const oy = (h % GAP) / 2;
    for (let y = oy; y <= h; y += GAP) {
      for (let x = ox; x <= w; x += GAP) {
        let dx = x - p.x;
        let dy = y - p.y;
        const d = Math.hypot(dx, dy);
        const f = p.s * Math.max(0, 1 - d / RADIUS);
        if (f > 0.001) {
          // Push outward along the cursor ray, swell, and darken
          const push = (f * f * 14) / (d || 1);
          dx *= push;
          dy *= push;
          ctx.fillStyle = ink;
          ctx.globalAlpha = 0.25 + f * 0.75;
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, 1 + f * 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = dim;
          ctx.globalAlpha = 1;
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  const loop = () => {
    p.x += (p.tx - p.x) * 0.18;
    p.y += (p.ty - p.y) * 0.18;
    p.s += (p.ts - p.s) * 0.12;
    draw();
    const settled = Math.abs(p.tx - p.x) < 0.3 && Math.abs(p.ty - p.y) < 0.3 && Math.abs(p.ts - p.s) < 0.005;
    raf = settled ? 0 : requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (p.s < 0.01) {
      p.x = e.clientX;
      p.y = e.clientY;
    }
    p.tx = e.clientX;
    p.ty = e.clientY;
    p.ts = 1;
    kick();
  };
  const onLeave = () => {
    p.ts = 0;
    kick();
  };

  resize();
  setColors();
  window.addEventListener('resize', resize);
  if (!reducedMotion) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
  }

  return {
    setColors,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };
}
