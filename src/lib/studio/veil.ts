/**
 * Halftone page veil: a radial hole opens from the centre, its edge
 * rendered as a 16px dot grid (haoqi's intro / route transition).
 */
const CELL = 16;
const DURATION = 800;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createVeil(canvas: HTMLCanvasElement, { reducedMotion = false } = {}) {
  const ctx = canvas.getContext('2d')!;
  let w = 0;
  let h = 0;
  let p = 0; // 0 = fully covered, 1 = fully open
  let raf = 0;

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };

  function draw() {
    ctx.clearRect(0, 0, w, h);
    if (p >= 1) return;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#fff';
    if (p <= 0) {
      ctx.fillRect(0, 0, w, h);
      return;
    }
    // Hole radius in normalised units (shorter side = 1), feathered edge
    const aspect = w / h;
    const maxR = Math.sqrt(Math.max(aspect, 1 / aspect) ** 2 + 1);
    const R = maxR * p;
    const edge = Math.max(0.5, R * 0.12);
    const scale = 2 / Math.min(w, h);
    ctx.beginPath();
    for (let y = 0; y < h + CELL; y += CELL) {
      for (let x = 0; x < w + CELL; x += CELL) {
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;
        const d = Math.hypot((cx - w / 2) * scale, (cy - h / 2) * scale);
        const t = Math.min(1, Math.max(0, (d - R) / edge));
        const a = t * t * (3 - 2 * t);
        if (a <= 0.01) continue;
        const r = 0.8 * a * CELL;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  const animate = (to: 0 | 1) =>
    new Promise<void>((done) => {
      cancelAnimationFrame(raf);
      const from = p;
      if (reducedMotion || from === to) {
        p = to;
        draw();
        return done();
      }
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / DURATION);
        p = from + (to - from) * ease(k);
        draw();
        if (k < 1) raf = requestAnimationFrame(tick);
        else done();
      };
      raf = requestAnimationFrame(tick);
    });

  resize();
  window.addEventListener('resize', resize);
  // Back/forward cache restores the covered state: reopen
  window.addEventListener('pageshow', (e) => e.persisted && animate(1));

  return {
    open: () => animate(1),
    close: () => animate(0),
    redraw: draw,
  };
}
