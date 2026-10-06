import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { scramble, bindScrambleHover } from '../site/scramble';
import { createField, type Field } from './field';
import { createVeil } from './veil';
import { initLiquidGlass } from './liquid-glass';
import type { Scene } from './scene';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

let lenis: Lenis | null = null;
let field: Field | null = null;
let scene: Scene | null = null;
let veil: ReturnType<typeof createVeil> | null = null;

/* ───────── Background: WebGL glass + fluid, 2D dot field as fallback ───────── */
async function initBackground() {
  const canvas = $<HTMLCanvasElement>('#field');
  if (!canvas) return;
  try {
    const { createScene } = await import('./scene');
    scene = createScene(canvas, { reducedMotion: reduced, dark: document.documentElement.dataset.theme === 'dark' });
  } catch (err) {
    console.warn('WebGL scene unavailable, using dot field', err);
    // A canvas that tried WebGL can't switch to 2D: swap in a fresh one
    const fresh = canvas.cloneNode() as HTMLCanvasElement;
    canvas.replaceWith(fresh);
    field = createField(fresh, { reducedMotion: reduced });
  }
}

/* ───────── Page transitions: halftone veil closes before leaving ───────── */
function initTransitions() {
  const el = $<HTMLCanvasElement>('#veil');
  if (!el) return;
  veil = createVeil(el, { reducedMotion: reduced });
  document.documentElement.classList.add('veil-js');
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || /\.\w+$/.test(url.pathname)) return;
    e.preventDefault();
    lenis?.stop();
    veil!.close().then(() => location.assign(url.href));
  });
}

/* ───────── Smooth scroll + same-page hash links ───────── */
function initScroll() {
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis?.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = $(url.hash);
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  });
}

/* ───────── Theme: A (system) → L → D ───────── */
function initTheme() {
  const root = document.documentElement;
  const btn = $<HTMLButtonElement>('#theme-toggle');
  const label = $('#theme-label');
  const meta = $<HTMLMetaElement>('meta[name="theme-color"]');
  const sys = window.matchMedia('(prefers-color-scheme: dark)');
  const names = { A: 'system', L: 'light', D: 'dark' } as const;
  type Mode = keyof typeof names;

  const apply = (mode: Mode, animate = true) => {
    const dark = mode === 'D' || (mode === 'A' && sys.matches);
    root.dataset.mode = mode;
    root.dataset.theme = dark ? 'dark' : 'light';
    if (meta) meta.content = dark ? '#081530' : '#bfdcf0';
    btn?.setAttribute('aria-label', `Theme: ${names[mode]}`);
    if (label) {
      if (animate) scramble(label, `THEME[${mode}]`, 0.35);
      else label.textContent = label.dataset.text = `THEME[${mode}]`;
    }
    field?.setColors();
    scene?.setTheme(dark);
    veil?.redraw();
  };
  apply((root.dataset.mode as Mode) ?? 'A', false);

  btn?.addEventListener('click', () => {
    const order: Mode[] = ['A', 'L', 'D'];
    const next = order[(order.indexOf(root.dataset.mode as Mode) + 1) % order.length];
    try {
      localStorage.setItem('theme-mode', next);
    } catch {
      /* private mode: theme just won't persist */
    }
    apply(next);
  });
  sys.addEventListener('change', () => root.dataset.mode === 'A' && apply('A', false));
}

/* ───────── Frame readouts: local clock, cursor position ───────── */
function initReadouts() {
  const clock = $('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
  const tick = () => clock && (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 10_000);

  const xy = $('#cursor-xy');
  const pad = (n: number) => String(Math.max(1, Math.round(n))).padStart(4, '0');
  window.addEventListener(
    'pointermove',
    (e) => xy && (xy.textContent = `${pad(e.clientX)} X ${pad(e.clientY)} Y`),
    { passive: true }
  );
}

/* ───────── Text helpers ───────── */
/** Wrap each [data-line] in a mask so it can slide up from below */
function maskLines() {
  $$('[data-line]').forEach((el) => {
    const mask = document.createElement('span');
    mask.className = 'line-mask';
    el.replaceWith(mask);
    mask.append(el);
  });
}

function splitWords(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent!.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) frag.append(part);
      else {
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.append(s);
      }
    });
    node.replaceWith(frag);
  });
}

const scrambleAll = (els: HTMLElement[], stagger = 0.05) =>
  els.forEach((el, i) => gsap.delayedCall(i * stagger, () => scramble(el, el.dataset.text ?? el.textContent ?? '', 0.6)));

/* ───────── Loader → intro ───────── */
async function runIntro() {
  const bar = $('#loader-bar');
  const set = (v: number) => bar && (bar.style.width = `${v}%`);
  set(25);
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  set(70);
  const lead = $$<HTMLImageElement>('img[loading="eager"]').filter((i) => !i.complete);
  const settled = (img: HTMLImageElement) =>
    new Promise((r) => {
      img.addEventListener('load', r, { once: true });
      img.addEventListener('error', r, { once: true });
    });
  await Promise.race([Promise.all(lead.map(settled)), new Promise((r) => setTimeout(r, 1800))]);
  set(100);
  await new Promise((r) => setTimeout(r, reduced ? 0 : 420));

  const heroLines = $$('.hero-title [data-line], .case-title [data-line]');
  const frameText = $$('#frame [data-scramble]');
  const tl = gsap.timeline();
  // Set start states before the page becomes visible, so nothing flashes
  if (!reduced) {
    gsap.set(heroLines, { yPercent: 105 });
    gsap.set('[data-in]', { autoAlpha: 0, y: 14 });
  }
  document.documentElement.classList.remove('is-loading');
  lenis?.start();
  // Arrived via /#section from another page: land there before the veil opens
  const target = location.hash && $(location.hash);
  if (target) {
    const y = target.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }
  veil?.open();
  if (reduced) return;

  tl.add(() => scrambleAll(frameText, 0.06), 0)
    .to(heroLines, { yPercent: 0, duration: 1.2, stagger: 0.09, ease: 'expo.out' }, 0.25)
    .to('[data-in]', { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out' }, 0.4)
    .add(() => scrambleAll($$('main [data-in] [data-scramble]'), 0.12), 0.4);
}

/* ───────── Night mode below the hero: page tokens follow the darkening sky ───────── */
function initDeep() {
  const lead = $('#top') ?? $('.case-hero');
  if (!lead) return;
  // Matches the backdrop blend midpoint (hero bottom at 45% of the viewport)
  // Only the start crossing matters, so the page stays deep all the way to the end
  const set = (on: boolean) => document.documentElement.classList.toggle('deep', on);
  ScrollTrigger.create({
    trigger: lead,
    start: 'bottom 45%',
    onEnter: () => set(true),
    onLeaveBack: () => set(false),
  });
}

/* ───────── Scroll reveals ───────── */
function initReveals() {
  $$('[data-words]').forEach((el) => {
    splitWords(el);
    if (reduced) return;
    gsap.to($$('.w', el), {
      opacity: 1,
      stagger: 0.05,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: 0.5 },
    });
  });
  if (reduced) return;

  $$('[data-reveal]').forEach((el) =>
    gsap.from(el, { autoAlpha: 0, y: 36, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } })
  );

  // Lines outside the hero slide up when they reach the viewport
  $$('[data-line]')
    .filter((el) => !el.closest('.hero-title, .case-title'))
    .forEach((el) =>
      gsap.from(el, { yPercent: 105, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el.parentElement!, start: 'top 92%' } })
    );

  // Tiles: image wipes up, caption decodes
  $$('[data-tile]').forEach((tile) => {
    const media = $('.tile-media', tile);
    const title = $<HTMLElement>('.tile-title', tile);
    gsap.from(media, {
      clipPath: 'inset(100% 0 0 0)',
      duration: 1.1,
      ease: 'expo.inOut',
      scrollTrigger: { trigger: tile, start: 'top 88%', onEnter: () => title && scramble(title, title.dataset.text ?? title.textContent ?? '', 0.7) },
    });
  });

  // Contact links decode once the footer arrives
  if ($('#contact')) ScrollTrigger.create({
    trigger: '#contact',
    start: 'top 60%',
    once: true,
    onEnter: () => scrambleAll($$('#contact [data-scramble]'), 0.08),
  });
}

/* ───────── Signature draws itself ───────── */
function initSignature() {
  const svg = $('[data-sign]');
  if (!svg) return;
  const paths = $$<SVGPathElement>('path', svg);
  paths.forEach((p) => {
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
  });
  if (reduced) return;
  const tl = gsap.timeline({ paused: true });
  paths.forEach((p) => tl.to(p, { strokeDashoffset: 0, duration: Math.max(0.25, p.getTotalLength() / 520), ease: 'power2.inOut' }));
  ScrollTrigger.create({ trigger: svg, start: 'top 80%', once: true, onEnter: () => tl.play() });
}

/* ───────── Manifesto: each word resolves at its scroll beat ───────── */
function initManifesto() {
  const words = $$('[data-mword]');
  if (!words.length || reduced) return;
  const shown = words.map(() => false);
  ScrollTrigger.create({
    trigger: '#manifesto',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      words.forEach((w, i) => {
        const on = self.progress > (i + 0.4) / (words.length + 1);
        if (on === shown[i]) return;
        shown[i] = on;
        gsap.to(w, { opacity: on ? 1 : 0, duration: 0.35, ease: 'power2.out', overwrite: true });
        if (on) scramble(w, w.dataset.text ?? w.textContent ?? '', 0.5);
      });
    },
  });
}

/* ───────── Redacted employer: click to decode ───────── */
function initRedact() {
  $$('[data-redact]').forEach((el) => {
    const reveal = () => {
      if (el.classList.contains('is-open')) return;
      el.classList.add('is-open');
      el.removeAttribute('role');
      el.removeAttribute('tabindex');
      el.removeAttribute('aria-label');
      scramble(el, el.dataset.redact!, reduced ? 0 : 0.6);
    };
    el.addEventListener('click', reveal);
    el.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), reveal()));
  });
}

/* ───────── Boot ───────── */
export async function boot() {
  initScroll();
  initTransitions();
  await initBackground();
  initTheme();
  initLiquidGlass({ reducedMotion: reduced });
  initReadouts();
  maskLines();
  initRedact();
  bindScrambleHover();
  initReveals();
  initDeep();
  initSignature();
  initManifesto();

  await runIntro();
  ScrollTrigger.refresh();
}
