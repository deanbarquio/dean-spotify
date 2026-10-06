import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { scramble } from './scramble';
import type { SpecimenScene } from './specimen-scene';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

let lenis: Lenis | null = null;
let specimen: SpecimenScene | null = null;

function scrollToY(y: number, duration = 1.2) {
  if (lenis) lenis.scrollTo(y, { duration });
  else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
}
/** Pinned sections sit inside a pin-spacer that carries their scroll length */
const scrollHost = (el: HTMLElement) => (el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el);

/* ───────── Smooth scroll ───────── */
function initScroll() {
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis?.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const target = $(a.getAttribute('href')!);
    if (!target) return;
    e.preventDefault();
    scrollToY(scrollHost(target).getBoundingClientRect().top + window.scrollY);
  });
}

/* ───────── Theme ───────── */
function initTheme() {
  const root = document.documentElement;
  const btn = $<HTMLButtonElement>('#theme-toggle');
  const meta = $<HTMLMetaElement>('meta[name="theme-color"]');
  const apply = (t: 'light' | 'dark', instant = false) => {
    root.dataset.theme = t;
    specimen?.setTheme(t, instant);
    if (meta) meta.content = t === 'dark' ? '#0a0907' : '#f2ede4';
    btn?.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  };
  apply(root.dataset.theme === 'light' ? 'light' : 'dark', true);
  btn?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode: theme just won't persist */
    }
    apply(next);
  });
}

/* ───────── Clinical micro-copy: clock, FPS vitals, ECG ───────── */
function initReadouts() {
  const clock = $('#intake-clock');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const tick = () => {
    if (!clock) return;
    const p = Object.fromEntries(parts.formatToParts(new Date()).map((x) => [x.type, x.value]));
    clock.textContent = `${p.year}.${p.month}.${p.day} - ${p.hour}:${p.minute}:${p.second}`;
  };
  tick();
  setInterval(tick, 1000);

  // Live FPS: the subject's actual frame rate
  const fpsEl = $('#vitals-fps');
  let frames = 0;
  let since = performance.now();
  gsap.ticker.add(() => {
    frames++;
    const now = performance.now();
    if (now - since > 1000) {
      if (fpsEl) fpsEl.textContent = String(Math.round((frames * 1000) / (now - since)));
      frames = 0;
      since = now;
    }
  });

  const ecg = $<SVGPathElement>('#vitals-ecg');
  if (ecg && !reduced) {
    const beat = { x: 0 };
    gsap.to(beat, {
      x: 160,
      duration: 1.4,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        const x = beat.x;
        ecg.setAttribute('d', `M0 13 H${x - 14} L${x - 10} 9 L${x - 6} 13 L${x - 3} 2 L${x} 24 L${x + 3} 13 H160`);
      },
    });
  }
}

/* Letters slip for a beat, then resolve (FRONTENC DEVELOPEP) */
function glitchLoop() {
  if (reduced) return;
  $$('[data-glitch]').forEach((el, n) => {
    const text = el.textContent ?? '';
    const slip = () => {
      const chars = [...text];
      const i = (Math.random() * chars.length) | 0;
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
      el.textContent = chars.join('');
      gsap.delayedCall(0.22, () => scramble(el, text, 0.35));
    };
    gsap.to({}, { duration: 3.2 + n * 0.9, repeat: -1, onRepeat: slip });
  });
}

/* ───────── Loader → intake reveal ───────── */
async function runIntro() {
  const pct = $('#loader-pct');
  const count = { v: 0 };
  await new Promise<void>((done) => {
    gsap.to(count, {
      v: 100,
      duration: reduced ? 0 : 1.4,
      ease: 'steps(20)',
      onUpdate: () => void (pct && (pct.textContent = String(Math.round(count.v)).padStart(3, '0'))),
      onComplete: done,
    });
  });
  await Promise.race([specimen?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 4000))]);

  const tl = gsap.timeline();
  tl.to('#loader', { autoAlpha: 0, duration: 0.4, ease: 'steps(4)' })
    .add(() => {
      document.documentElement.classList.remove('is-loading');
      lenis?.start();
    })
    .from('.topbar-rule', { scaleX: 0, duration: 1.1, ease: 'expo.inOut' }, 0.1)
    .from('.topbar-file, .topbar-nav, .sidebar-label', { autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0.3)
    .from('.hero-panel', { clipPath: 'inset(0 100% 0 0)', duration: 1.1, ease: 'expo.inOut' }, 0.2)
    .from('.barcode', { scaleX: 0, transformOrigin: 'left', duration: 0.6, ease: 'steps(8)' }, 0.8)
    .from('[data-in]', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, 0.6)
    .from('[data-tape-in]', { xPercent: -110, duration: 1, ease: 'expo.out' }, 1.1)
    .add(() => glitchLoop(), 1.5);
  if (reduced) tl.progress(1);
}

/* ───────── Hero: pinned dissection ───────── */
function initHero() {
  const state = $('#sidebar-state');
  const setState = (s: string) => state && state.textContent !== s && scramble(state, s, 0.3);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: '+=180%',
      scrub: true,
      pin: true,
      onUpdate: (self) => {
        const p = self.progress;
        specimen?.setDissect(Math.min(1, p / 0.7));
        setState(p < 0.2 ? 'Unfolding' : p < 0.7 ? 'Dissecting' : 'Core exposed');
      },
    },
  });
  tl.to('.intake', { autoAlpha: 0, y: -60, ease: 'power2.in', duration: 0.25 }, 0.12)
    .to('.tape--hero', { x: () => window.innerWidth * 1.2, rotate: 6, duration: 0.3, ease: 'power2.in' }, 0.05)
    .to('.vitals', { y: 40, autoAlpha: 0.0, duration: 0.2 }, 0.2)
    .fromTo('.band', { autoAlpha: 0, clipPath: 'inset(0 100% 0 0)' }, { autoAlpha: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.2, ease: 'power2.out' }, 0.42)
    .fromTo('.intake-year', { autoAlpha: 0, xPercent: 15 }, { autoAlpha: 1, xPercent: -25, duration: 0.55, ease: 'none' }, 0.45)
    .fromTo('[data-acquired]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.15, ease: 'power3.out' }, 0.55)
    .fromTo('[data-core-hint]', { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.1 }, 0.72)
    .to({}, { duration: 0.15 });

  const band = $('[data-band]');
  if (band && !reduced) gsap.fromTo(band, { xPercent: 0 }, { xPercent: -50, duration: 24, ease: 'none', repeat: -1 });

  // After the hero, park the specimen to the right as a companion
  ScrollTrigger.create({
    trigger: '#profile',
    start: 'top bottom',
    end: 'top 30%',
    scrub: true,
    onUpdate: (self) => specimen?.setPark(self.progress),
  });
}

function onCoreClick() {
  const hint = $('[data-core-hint]');
  const mode = $('#topbar-mode');
  if (hint) {
    scramble(hint, 'Debug mode active', 0.4);
    gsap.fromTo(hint, { scale: 1.15 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  }
  if (mode) scramble(mode, 'Debug', 0.4);
  const profile = $('#profile');
  if (profile) gsap.delayedCall(0.9, () => scrollToY(profile.getBoundingClientRect().top + window.scrollY));
}

/* ───────── Headlines, reveals, manifesto ───────── */
function splitHeadlines() {
  $$('[data-split]').forEach((h) => {
    const lines = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = lines.map((l) => `<span class="line"><span>${l.trim()}</span></span>`).join('');
    if (reduced) return;
    gsap.from($$('.line > span', h), {
      yPercent: 110,
      duration: 1.1,
      stagger: 0.1,
      ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 85%' },
    });
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

function initReveals() {
  splitHeadlines();
  const words = $('[data-words]');
  if (words) splitWords(words);
  if (reduced) return;
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, { autoAlpha: 0, y: 40, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  if (words) {
    gsap.to($$('.w', words), {
      opacity: 1,
      stagger: 0.06,
      ease: 'none',
      scrollTrigger: { trigger: words, start: 'top 80%', end: 'bottom 55%', scrub: 0.5 },
    });
  }
  // Topbar mode label follows the section in view
  const mode = $('#topbar-mode');
  $$('[data-mode]').forEach((s) => {
    ScrollTrigger.create({
      trigger: s,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => self.isActive && mode && scramble(mode, s.dataset.mode!, 0.35),
    });
  });
}

/* ───────── Case files: pinned specimen reel + case dialog ───────── */
function initCases() {
  const section = $('#cases');
  const track = $('[data-reel-track]');
  if (!section || !track) return;
  const cards = $$('[data-reel-card]', section);
  const n = cards.length;
  const countEl = $('[data-reel-count]', section);
  const bar = $('[data-reel-bar]', section);
  const jumps = $$('[data-reel-jump]', section);
  const pad = (i: number) => String(i + 1).padStart(2, '0');

  // Scan lines sweep every microscope slide
  if (!reduced) {
    $$('.scope-scan', section).forEach((s, i) =>
      gsap.fromTo(s, { top: '0%' }, { top: '100%', duration: 2.6, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: i * 0.3 })
    );
  }

  let active = -1;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    if (countEl) scramble(countEl, `Case ${pad(i)}`, 0.3);
    jumps.forEach((j, k) => j.classList.toggle('is-active', k === i));
    const img = $('[data-scope-img]', cards[i]);
    if (img && !img.dataset.seen && !reduced) {
      img.dataset.seen = '1';
      gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)', scale: 1.15 }, { clipPath: 'inset(0 0 0% 0)', scale: 1, duration: 1.1, ease: 'expo.out' });
    }
  };

  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => {
    let step = 0;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      step = cards[0].offsetWidth + gap;
    };
    measure();

    const layout = (f: number) => {
      gsap.set(track, { x: -f * step });
      cards.forEach((card, i) => {
        const d = i - f;
        const ad = Math.min(1, Math.abs(d));
        gsap.set(card, { scale: 1 - ad * 0.1, opacity: 1 - ad * 0.55, rotationY: gsap.utils.clamp(-8, 8, -d * 8), transformPerspective: 1600 });
        const img = $('[data-scope-img]', card);
        if (img) gsap.set(img, { xPercent: gsap.utils.clamp(-6, 6, d * -5) });
      });
      if (bar) gsap.set(bar, { scaleX: n > 1 ? f / (n - 1) : 1 });
      setActive(Math.max(0, Math.min(n - 1, Math.round(f))));
    };
    layout(0);

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${(n - 1) * window.innerHeight * 0.65}`,
      pin: true,
      scrub: reduced ? false : 0.8,
      snap: reduced ? undefined : { snapTo: 1 / (n - 1), duration: { min: 0.2, max: 0.6 }, ease: 'power2.inOut' },
      invalidateOnRefresh: true,
      onRefresh: measure,
      onUpdate: (self) => layout(self.progress * (n - 1)),
    });

    const go = (i: number) => scrollToY(st.start + (i / (n - 1)) * (st.end - st.start) + 1, 0.9);
    const onJump = (e: Event) => go(Number((e.currentTarget as HTMLElement).dataset.reelJump));
    jumps.forEach((j) => j.addEventListener('click', onJump));
    const onKey = (e: KeyboardEvent) => {
      if (!st.isActive || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      e.preventDefault();
      go(Math.max(0, Math.min(n - 1, active + (e.key === 'ArrowRight' ? 1 : -1))));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      jumps.forEach((j) => j.removeEventListener('click', onJump));
      window.removeEventListener('keydown', onKey);
      gsap.set([track, ...cards], { clearProps: 'all' });
    };
  });
  mm.add('(max-width: 960px)', () => {
    if (reduced) return;
    cards.forEach((card, i) =>
      ScrollTrigger.create({ trigger: card, start: 'top 75%', once: true, onEnter: () => setActive(i) })
    );
    gsap.utils.toArray<HTMLElement>(cards).forEach((card) =>
      gsap.from(card, { y: 50, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 88%' } })
    );
  });

  /* Case dialog */
  const data: Record<string, any> = Object.fromEntries(JSON.parse($('#case-data')?.textContent ?? '[]').map((p: any) => [p.id, p]));
  const box = $('#case');
  const panel = box && $('.case-panel', box);
  if (!box || !panel) return;
  let lastFocus: HTMLElement | null = null;

  const close = () => {
    if (!box.classList.contains('is-open')) return;
    gsap.to(panel, {
      clipPath: 'inset(0 0 100% 0)',
      duration: reduced ? 0 : 0.4,
      ease: 'power3.in',
      onComplete: () => {
        box.classList.remove('is-open');
        box.hidden = true;
        document.documentElement.style.overflow = '';
        lenis?.start();
        lastFocus?.focus();
      },
    });
  };
  $$('[data-case-close]', box).forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  $$('[data-case]', section).forEach((trigger) =>
    trigger.addEventListener('click', () => {
      const p = data[trigger.dataset.case ?? ''];
      if (!p) return;
      lastFocus = trigger.closest('[data-reel-card]')?.querySelector<HTMLElement>('button[data-case]') ?? trigger;
      $('#case-kind')!.textContent = `Case file // ${p.kind} // ${p.year}`;
      $('#case-title')!.textContent = p.title;
      $('#case-summary')!.textContent = p.summary;
      $('#case-detail')!.textContent = p.detail;
      $('#case-stack')!.innerHTML = p.stack.map((s: string) => `<span class="chip">${s}</span>`).join('');
      const link = $<HTMLAnchorElement>('#case-link')!;
      link.hidden = !p.url;
      if (p.url) link.href = p.url;
      const shots: string[] = p.gallery ?? (p.image ? [p.image] : []);
      $('#case-gallery')!.innerHTML = shots.map((src) => `<img src="${src}" alt="${p.title} screenshot" loading="lazy" />`).join('');
      box.hidden = false;
      box.classList.add('is-open');
      lenis?.stop();
      document.documentElement.style.overflow = 'hidden';
      gsap.fromTo(panel, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: reduced ? 0 : 0.7, ease: 'expo.out' });
      scramble($('#case-title')!, p.title, 0.5);
      $<HTMLButtonElement>('.case-close', box)?.focus();
    })
  );
}

/* ───────── History: ECG line draws as you scroll ───────── */
function initHistory() {
  const path = $<SVGPathElement>('#history-ecg');
  if (!path) return;
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
  if (reduced) return;
  gsap.to(path, {
    strokeDashoffset: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.history', start: 'top 70%', end: 'bottom 70%', scrub: true },
  });
}

/* ───────── Equipment marquees react to scroll velocity ───────── */
function initKit() {
  const tweens = $$('[data-kit]').map((row) => {
    const dir = Number(row.dataset.kit);
    const track = $('.kit-track', row)!;
    return gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 34, ease: 'none', repeat: -1 });
  });
  if (reduced) return tweens.forEach((t) => t.pause());
  ScrollTrigger.create({
    trigger: '#toolkit',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const boost = 1 + Math.min(5, Math.abs(self.getVelocity()) / 500);
      tweens.forEach((t) => gsap.to(t, { timeScale: boost, duration: 0.2, overwrite: true }));
      gsap.to(tweens, { timeScale: 1, duration: 1, delay: 0.3, overwrite: false });
    },
  });
}

/* ───────── Witness statements: typewriter ───────── */
function initWords() {
  const data: { name: string; title: string; date: string; quote: string }[] = JSON.parse($('#words-data')?.textContent ?? '[]');
  const text = $('#words-text');
  const name = $('#words-name');
  const title = $('#words-title');
  const date = $('#words-date');
  if (!text || !name || !title || !date) return;
  const s = { n: 0 };
  const type = (quote: string) => {
    gsap.killTweensOf(s);
    s.n = 0;
    gsap.to(s, {
      n: quote.length,
      duration: reduced ? 0 : Math.min(3.2, quote.length / 95),
      ease: 'none',
      onUpdate: () => void (text.textContent = quote.slice(0, Math.round(s.n))),
    });
  };
  const tabs = $$('[data-word]');
  tabs.forEach((b) =>
    b.addEventListener('click', () => {
      const d = data[Number(b.dataset.word)];
      tabs.forEach((x) => {
        x.classList.toggle('is-active', x === b);
        x.setAttribute('aria-selected', String(x === b));
      });
      scramble(name, d.name, 0.4);
      title.textContent = d.title;
      date.textContent = d.date;
      type(d.quote);
    })
  );
  ScrollTrigger.create({ trigger: '#words', start: 'top 70%', once: true, onEnter: () => type(data[0].quote) });
}

/* ───────── Boot ───────── */
export async function boot() {
  initScroll();

  const canvas = $<HTMLCanvasElement>('#specimen');
  const webgl = (() => {
    try {
      return !!document.createElement('canvas').getContext('webgl2');
    } catch {
      return false;
    }
  })();
  if (canvas && webgl) {
    try {
      const { createSpecimenScene } = await import('./specimen-scene');
      specimen = createSpecimenScene(canvas, { reducedMotion: reduced, onCoreClick });
    } catch (err) {
      // The page is fully usable without the 3D specimen
      console.warn('Specimen scene unavailable', err);
    }
  }
  initTheme();
  initReadouts();

  // Pins first, in page order, so later triggers measure the pinned spacing
  initHero();
  initCases();
  initReveals();
  initHistory();
  initKit();
  initWords();

  await runIntro();
  ScrollTrigger.refresh();
}
