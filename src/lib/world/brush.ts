/**
 * Painterly masks, drawn once on a canvas and handed to CSS as data URLs
 * (--mask-hero, --mask-scratch). White = visible. Used with mask-image so
 * project imagery dissolves into the night with rough, dry-brush edges.
 */
import { rng } from './nature';

type Ctx = CanvasRenderingContext2D;

/** Irregular blob: a polygon whose radius wobbles around the centre */
function blob(g: Ctx, rand: () => number, x: number, y: number, r: number, squash = 1) {
  const n = 9 + Math.floor(rand() * 7);
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = r * (0.55 + rand() * 0.6);
    const px = x + Math.cos(a) * k;
    const py = y + Math.sin(a) * k * squash;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
  g.fill();
}

/** Dry-brush stroke: a bundle of thin, broken horizontal hairs */
function stroke(g: Ctx, rand: () => number, x0: number, x1: number, y: number, width: number) {
  const hairs = 10 + Math.floor(rand() * 10);
  for (let h = 0; h < hairs; h++) {
    const yy = y + (rand() - 0.5) * width;
    let x = x0 + rand() * (x1 - x0) * 0.15;
    const end = x1 - rand() * (x1 - x0) * 0.15;
    while (x < end) {
      const len = 8 + rand() * 60;
      g.globalAlpha = 0.35 + rand() * 0.65;
      g.fillRect(x, yy + (rand() - 0.5) * 2, len, 1 + rand() * 2.6);
      x += len + (rand() < 0.25 ? rand() * 18 : 0);
    }
  }
  g.globalAlpha = 1;
}

/**
 * Bite chips out of the rim only (an elliptical band around cx/cy), so the edge
 * reads as torn paint while the picture inside stays whole
 */
function erode(g: Ctx, rand: () => number, cx: number, cy: number, rx: number, ry: number, count: number) {
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.86 + rand() * 0.3;
    g.globalAlpha = 0.4 + rand() * 0.6;
    blob(g, rand, cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 2 + rand() * 10);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

function heroMask() {
  const W = 1200;
  const H = 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const rand = rng(91);
  g.fillStyle = '#fff';
  // Body: overlapping lumps filling a wide arch, heavier at the top
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const x = W * 0.5 + Math.cos(a) * r * W * 0.4;
    const y = H * 0.42 + Math.sin(a) * r * H * 0.4;
    blob(g, rand, x, y, 40 + rand() * 80, 0.8);
  }
  // Ragged lower edge: dry-brush streaks trailing off to the sides
  for (let i = 0; i < 26; i++) {
    const y = H * (0.62 + rand() * 0.26);
    const span = W * (0.18 + rand() * 0.3);
    const cx = W * (0.3 + rand() * 0.4);
    stroke(g, rand, cx - span, cx + span, y, 10 + rand() * 18);
  }
  // Paint flecks scattered around the rim
  for (let i = 0; i < 900; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.82 + rand() * 0.3;
    g.globalAlpha = rand();
    blob(g, rand, W * 0.5 + Math.cos(a) * r * W * 0.42, H * 0.44 + Math.sin(a) * r * H * 0.42, 1 + rand() * 4);
  }
  g.globalAlpha = 1;
  // Chips only beyond the body, so the picture itself stays unbroken
  erode(g, rand, W * 0.5, H * 0.44, W * 0.47, H * 0.47, 500);
  return c.toDataURL('image/png');
}

function scratchMask() {
  const W = 1200;
  const H = 300;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const rand = rng(17);
  g.fillStyle = '#fff';
  // A violent smear: a solid core, slashing strokes fanning out, dry hairs and spatter at the ends
  for (let i = 0; i < 120; i++) blob(g, rand, W * (0.16 + rand() * 0.68), H * (0.32 + rand() * 0.36), 18 + rand() * 40, 0.5);
  for (let i = 0; i < 34; i++) {
    const y = H * (0.18 + rand() * 0.64);
    const x0 = W * (0.0 + rand() * 0.18);
    const x1 = W * (0.8 + rand() * 0.2);
    stroke(g, rand, x0, x1, y, 16 + rand() * 34);
  }
  for (let i = 0; i < 700; i++) {
    g.globalAlpha = rand();
    const side = rand() < 0.5 ? rand() * 0.2 : 0.8 + rand() * 0.2;
    blob(g, rand, W * side, H * (0.1 + rand() * 0.8), 1 + rand() * 5);
  }
  g.globalAlpha = 1;
  erode(g, rand, W * 0.5, H * 0.5, W * 0.36, H * 0.3, 600);
  return c.toDataURL('image/png');
}

/** Round blot with ragged, smeared edges: the "next project" window */
function blotMask() {
  const S = 700;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const rand = rng(53);
  g.fillStyle = '#fff';
  for (let i = 0; i < 160; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * S * 0.28;
    blob(g, rand, S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, 40 + rand() * 70);
  }
  // Short, faint outward drags around the rim, like paint pushed with a dry brush
  for (let i = 0; i < 220; i++) {
    const a = rand() * Math.PI * 2;
    const r0 = S * (0.3 + rand() * 0.05);
    const len = S * (0.015 + rand() * 0.04);
    g.globalAlpha = 0.15 + rand() * 0.35;
    g.save();
    g.translate(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
    g.rotate(a);
    g.fillRect(0, -1 - rand() * 2, len, 2 + rand() * 4);
    g.restore();
  }
  g.globalAlpha = 1;
  erode(g, rand, S / 2, S / 2, S * 0.38, S * 0.38, 180);
  return c.toDataURL('image/png');
}

export function installBrushMasks() {
  const root = document.documentElement.style;
  root.setProperty('--mask-hero', `url(${heroMask()})`);
  root.setProperty('--mask-blot', `url(${blotMask()})`);
  root.setProperty('--mask-scratch', `url(${scratchMask()})`);
}
