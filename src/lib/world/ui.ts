/**
 * Overworld page wiring: entry gate (with or without sound), landmark markers,
 * the focus caption (title + View project over the scene), the detail panel
 * (cloned from hidden server-rendered sections), the places drawer, sound
 * toggle, keyboard and #hash deep links.
 */
import { createWorld, type World } from './world';
import { createSound } from './audio';
import { PLACES } from './places';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

export function boot() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sound = createSound();
  const ids = PLACES.map((p) => p.id);

  const gate = $('#gate');
  const panel = $('#panel');
  const panelBody = $('#panel-body');
  const panelCount = $('#panel-count');
  const drawer = $('#drawer');
  const listBtns = [$<HTMLButtonElement>('#nav-list'), $<HTMLButtonElement>('#nav-projects')];
  const soundBtn = $<HTMLButtonElement>('#nav-sound');
  const markers = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-marker]').forEach((el) => markers.set(el.dataset.marker!, el));

  let world: World | null = null;
  let current: string | null = null;
  let opener: HTMLElement | null = null;

  /* ───────── Focus: caption over the scene, detail panel on request ───────── */
  const caption = $('#caption');
  const capSub = $('#cap-sub');
  const capTitle = $('#cap-title');
  const capView = $<HTMLButtonElement>('#cap-view');
  let detail = false;
  const VIEW: Record<string, string> = { about: 'About me', contact: 'Get in touch' };

  const fillPanel = (id: string) => {
    const tpl = document.querySelector(`.tpls [data-tpl="${id}"]`);
    if (!tpl) return;
    panelBody.replaceChildren(...[...tpl.childNodes].map((n) => n.cloneNode(true)));
    panelBody.scrollTop = 0;
    const i = ids.indexOf(id);
    panelCount.textContent = `${String(i + 1).padStart(2, '0')} / ${String(ids.length).padStart(2, '0')}`;
  };
  /* Portal dive: 0 = looking at the orb, 1 = through it (the detail sheet opens) */
  let dive = 0;
  let diveAnim = 0;
  const setDive = (p: number) => {
    dive = Math.min(1, Math.max(0, p));
    caption.style.setProperty('--dive', String(dive));
    world?.setDive(dive);
  };
  /** Glide the dive to a value, then run `done` */
  const glideDive = (to: number, done?: () => void) => {
    cancelAnimationFrame(diveAnim);
    const from = dive;
    const t0 = performance.now();
    const dur = reduced ? 1 : 900 + Math.abs(to - from) * 500;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setDive(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) diveAnim = requestAnimationFrame(tick);
      else done?.();
    };
    diveAnim = requestAnimationFrame(tick);
  };
  const portalImage = (id: string) => document.querySelector<HTMLImageElement>(`.tpls [data-tpl="${id}"] .shot img`)?.getAttribute('src') ?? undefined;

  const showDetail = () => {
    if (!current) return;
    cancelAnimationFrame(diveAnim);
    setDive(1);
    detail = true;
    fillPanel(current);
    panel.hidden = false;
    document.body.classList.add('has-panel');
    requestAnimationFrame(() => panel.classList.add('is-open'));
    panelBody.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };
  const hideDetail = (backOut = true) => {
    if (!detail) return;
    detail = false;
    document.body.classList.remove('has-panel');
    panel.classList.remove('is-open');
    window.setTimeout(() => !detail && (panel.hidden = true), reduced ? 0 : 320);
    // Step back out through the portal
    if (backOut) glideDive(0);
    capView.focus({ preventScroll: true });
  };
  /** Button route into the portal: fly through, then open */
  const enterPortal = () => {
    if (!current || detail) return;
    glideDive(1, showDetail);
  };
  const open = (id: string, from?: HTMLElement | null) => {
    const place = PLACES.find((p) => p.id === id);
    if (!place) return;
    if (!current) opener = from ?? (document.activeElement as HTMLElement | null);
    closeDrawer();
    current = id;
    capSub.textContent = place.sub;
    capTitle.textContent = place.label;
    capView.textContent = VIEW[id] ?? 'View project';
    caption.style.setProperty('--paint', place.paint);
    caption.hidden = false;
    document.body.classList.add('has-focus');
    // Restart the caption entrance for every new place
    caption.classList.remove('is-open');
    requestAnimationFrame(() => caption.classList.add('is-open'));
    if (detail) fillPanel(id);
    markers.forEach((el, k) => el.classList.toggle('is-active', k === id));
    cancelAnimationFrame(diveAnim);
    world?.focus(id, portalImage(id));
    // Stepping prev / next from inside a portal lands you inside the next one
    setDive(detail ? 1 : 0);
    sound.blip('open');
    history.replaceState(null, '', `#${id}`);
    if (!detail) capView.focus({ preventScroll: true });
  };
  const close = () => {
    if (!current) return;
    hideDetail(false);
    cancelAnimationFrame(diveAnim);
    setDive(0);
    current = null;
    document.body.classList.remove('has-focus');
    caption.classList.remove('is-open');
    window.setTimeout(() => !current && (caption.hidden = true), reduced ? 0 : 400);
    markers.forEach((el) => el.classList.remove('is-active'));
    world?.release();
    sound.blip('close');
    history.replaceState(null, '', location.pathname);
    opener?.focus({ preventScroll: true });
    opener = null;
  };
  const step = (d: number) => current && open(ids[(ids.indexOf(current) + d + ids.length) % ids.length]);
  capView.addEventListener('click', enterPortal);

  /* Scroll / swipe into the portal; scrolling up at the top of the sheet steps back out */
  const nudgeDive = (delta: number) => {
    if (!current) return;
    if (detail) {
      if (delta < 0 && panelBody.scrollTop <= 0) {
        hideDetail(false);
        setDive(0.92);
      }
      return;
    }
    cancelAnimationFrame(diveAnim);
    setDive(dive + delta);
    if (dive >= 1) showDetail();
  };
  window.addEventListener(
    'wheel',
    (e) => {
      if (!current || (detail && panelBody.scrollTop > 0)) return;
      // Normalise line / page deltas; one notch ≈ 8% of the dive
      const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * h() : e.deltaY;
      nudgeDive(Math.max(-0.2, Math.min(0.2, px * 0.0008)));
    },
    { passive: true }
  );
  const h = () => window.innerHeight;
  let touchY: number | null = null;
  window.addEventListener('touchstart', (e) => (touchY = e.touches[0]?.clientY ?? null), { passive: true });
  window.addEventListener(
    'touchmove',
    (e) => {
      if (touchY === null || !current || e.touches.length > 1) return;
      const y = e.touches[0].clientY;
      // Swipe up = forward, like scrolling down
      if (!detail || panelBody.scrollTop <= 0) nudgeDive((touchY - y) / (h() * 0.6));
      touchY = y;
    },
    { passive: true }
  );
  window.addEventListener('touchend', () => (touchY = null), { passive: true });
  $('#cap-prev').addEventListener('click', () => step(-1));
  $('#cap-next').addEventListener('click', () => step(1));
  $('#cap-close').addEventListener('click', close);
  $('#panel-close').addEventListener('click', () => hideDetail());
  $('#panel-prev').addEventListener('click', () => step(-1));
  $('#panel-next').addEventListener('click', () => step(1));

  /* ───────── Drawer ───────── */
  let drawerFrom: HTMLElement = listBtns[0];
  const openDrawer = (from: HTMLElement = listBtns[0]) => {
    drawerFrom = from;
    drawer.hidden = false;
    listBtns.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    drawer.querySelector<HTMLElement>('button')?.focus();
  };
  function closeDrawer() {
    drawer.hidden = true;
    listBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  listBtns.forEach((b) => b.addEventListener('click', () => (drawer.hidden ? openDrawer(b) : closeDrawer())));
  drawer.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-place]');
    if (b) open(b.dataset.place!, drawerFrom);
  });

  /* ───────── Nav, markers, sound ───────── */
  document.querySelectorAll<HTMLElement>('[data-open]').forEach((b) => b.addEventListener('click', () => open(b.dataset.open!, b)));
  $('#nav-home').addEventListener('click', () => (close(), world?.overview()));
  markers.forEach((el, id) => {
    el.addEventListener('click', () => (current === id ? close() : open(id, el)));
    el.addEventListener('pointerenter', () => (world?.setHover(id), sound.blip('hover')));
    el.addEventListener('pointerleave', () => world?.setHover(null));
  });
  const setSound = (on: boolean) => {
    sound.setOn(on);
    soundBtn.setAttribute('aria-pressed', String(on));
    $('#sound-state').textContent = on ? 'on' : 'off';
  };
  soundBtn.addEventListener('click', () => setSound(!sound.on));

  /* ───────── Keyboard ───────── */
  const PAN: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1],
  };
  window.addEventListener('keydown', (e) => {
    // Escape peels one layer at a time: drawer → detail panel → focused place
    if (e.key === 'Escape') return void (!drawer.hidden ? closeDrawer() : detail ? hideDetail() : close());
    const typing = (e.target as Element).closest('input, textarea, [contenteditable]');
    if (typing || e.metaKey || e.ctrlKey || e.altKey || !document.body.classList.contains('is-in')) return;
    // Arrow keys scroll the panel when focus is inside it
    if (panel.contains(e.target as Node) && e.key.startsWith('Arrow')) return;
    // While a place is focused, left / right step between places
    if (current && !detail && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return void (e.preventDefault(), step(e.key === 'ArrowLeft' ? -1 : 1));
    const pan = PAN[e.key];
    if (pan) return void (e.preventDefault(), world?.nudge(...pan));
    if (e.key === '+' || e.key === '=') world?.zoom(0.85);
    if (e.key === '-') world?.zoom(1.18);
  });

  /* ───────── Deep links: #<place>, #work / #index → drawer ───────── */
  const route = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    if (ids.includes(h)) open(h);
    else if (h === 'work' || h === 'index') openDrawer();
  };

  /* ───────── World + gate ───────── */
  const canvas = $<HTMLCanvasElement>('#world');
  const enter = (withSound: boolean) => {
    gate.classList.add('is-gone');
    document.body.classList.add('is-in');
    window.setTimeout(() => (gate.hidden = true), reduced ? 0 : 700);
    try {
      sessionStorage.setItem('world-entered', '1');
    } catch {}
    setSound(withSound);
    world?.enter();
    window.setTimeout(() => (route(), !world && drawer.hidden && openDrawer()), reduced ? 0 : 900);
  };
  $('#gate-sound').addEventListener('click', () => enter(true));
  $('#gate-quiet').addEventListener('click', () => enter(false));

  const bar = $('#gate-bar');
  const pct = $('#gate-pct');
  const ready = () => {
    bar.style.transform = 'scaleX(1)';
    pct.textContent = '100%';
    gate.classList.add('is-ready');
    gate.querySelectorAll('button').forEach((b) => (b.disabled = false));
    let seen = false;
    try {
      seen = sessionStorage.getItem('world-entered') === '1';
    } catch {}
    // Coming back from a case study: skip the gate (sound stays off until asked for)
    if (seen) enter(false);
    else $('#gate-quiet').focus();
  };

  // Let the gate paint before the (synchronous) island build
  requestAnimationFrame(() =>
    window.setTimeout(() => {
      try {
        world = createWorld(canvas, {
          reducedMotion: reduced,
          markers,
          onPick: (id) => (current === id ? close() : open(id)),
          onHover: (id) => {
            markers.forEach((el, k) => el.classList.toggle('is-hover', k === id));
            if (id) sound.blip('hover');
          },
          // Headline steps aside once the visitor dives into the valley
          onMove: (_x, _z, dist) => document.body.classList.toggle('is-close', dist < 80),
          onThunder: (strength, delay) => window.setTimeout(() => sound.thunder(strength), delay * 1000),
        });
      } catch (err) {
        // No WebGL: the drawer becomes the way around
        console.warn('Overworld unavailable', err);
        document.body.classList.add('no-world');
      }
      ready();
    }, 60)
  );
}

