/**
 * Overworld page wiring: entry gate (with or without sound), landmark markers,
 * the focus caption (title + View project over the scene), the detail panel
 * (cloned from hidden server-rendered sections), the places drawer, sound
 * toggle, keyboard and #hash deep links.
 */
import { createWorld, type World } from './world';
import { createSound } from './audio';
import { PLACES } from './places';
import { installBrushMasks } from './brush';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

export function boot() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sound = createSound();
  const ids = PLACES.map((p) => p.id);
  installBrushMasks();

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
    panelBody.append(nextBlock(ids[(i + 1) % ids.length]));
  };
  /** Foot of every project view: the next project glimpsed through a paint blot */
  const nextBlock = (nextId: string) => {
    const place = PLACES.find((p) => p.id === nextId)!;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pv-next';
    btn.style.setProperty('--paint', place.paint);
    const blot = document.createElement('span');
    blot.className = 'pv-next-blot';
    const img = portalImage(nextId);
    if (img) blot.style.backgroundImage = `url("${img}")`;
    const label = document.createElement('span');
    label.className = 'pv-next-label';
    label.textContent = 'Next project';
    const title = document.createElement('span');
    title.className = 'pv-next-title';
    title.textContent = place.label;
    btn.append(blot, label, title);
    btn.addEventListener('click', () => step(1));
    return btn;
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
  const portalImage = (id: string) => document.querySelector<HTMLImageElement>(`.tpls [data-tpl="${id}"] .pv-hero img`)?.getAttribute('src') ?? undefined;

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
      if (!current || !drawer.hidden || (detail && panelBody.scrollTop > 0)) return;
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
      if (touchY === null || !current || !drawer.hidden || e.touches.length > 1) return;
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
    // The menu sits over everything: leave any project view first
    if (detail) hideDetail();
    drawer.hidden = false;
    document.body.classList.add('has-menu');
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    listBtns.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    drawer.querySelector<HTMLElement>('.menu-row')?.focus({ preventScroll: true });
  };
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('has-menu');
    scratchOff();
    window.setTimeout(() => !drawer.classList.contains('is-open') && (drawer.hidden = true), reduced ? 0 : 400);
    listBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  listBtns.forEach((b) => b.addEventListener('click', () => (drawer.hidden ? openDrawer(b) : closeDrawer())));
  $('#menu-close').addEventListener('click', () => (closeDrawer(), drawerFrom.focus({ preventScroll: true })));
  drawer.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-place]');
    if (b) open(b.dataset.place!, drawerFrom);
  });

  /* Hover preview: the row's project seen through ice behind the list */
  const scratch = $('#menu-scratch');
  let scratchUrl = '';
  const scratchOn = (row: HTMLElement) => {
    const url = row.dataset.image ?? '';
    const r = row.getBoundingClientRect();
    // Follow the row, but keep the pane and its reflection on screen
    const y = Math.min(Math.max(r.top + r.height / 2, 200), window.innerHeight - 320);
    scratch.style.top = `${y}px`;
    scratch.style.setProperty('--paint', row.style.getPropertyValue('--paint'));
    if (url !== scratchUrl) {
      scratchUrl = url;
      scratch.style.setProperty('--img', url ? `url("${url}")` : 'none');
      // Restart the fade-in so each new project surfaces rather than swapping
      scratch.classList.remove('is-on');
      void scratch.offsetWidth;
    }
    scratch.classList.toggle('is-blank', !url);
    scratch.classList.add('is-on');
  };
  function scratchOff() {
    scratch.classList.remove('is-on');
  }
  drawer.querySelectorAll<HTMLElement>('.menu-row').forEach((row) => {
    row.addEventListener('pointerenter', () => (scratchOn(row), sound.blip('hover')));
    row.addEventListener('focus', () => scratchOn(row));
  });
  drawer.querySelector('.menu-list')!.addEventListener('pointerleave', scratchOff);

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
  /* Any input during the intro fast-forwards it into the home view */
  const skip = () => world?.playingIntro() && world.skipIntro();
  ['pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, skip, { passive: true }));

  window.addEventListener('keydown', (e) => {
    if (world?.playingIntro()) return void skip();
    // Escape peels one layer at a time: drawer → detail panel → focused place
    if (e.key === 'Escape') return void (!drawer.hidden ? closeDrawer() : detail ? hideDetail() : close());
    const typing = (e.target as Element).closest('input, textarea, [contenteditable]');
    if (typing || e.metaKey || e.ctrlKey || e.altKey || !document.body.classList.contains('is-in')) return;
    // Arrow keys scroll the project view / menu list instead of steering the camera
    if (!drawer.hidden || (panel.contains(e.target as Node) && e.key.startsWith('Arrow'))) return;
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

  /* Lightning seen through the night veil (menu / project view); never for reduced motion */
  const bolt = $('#bolt-flash');
  const strikeFlash = () => {
    if (reduced || !document.body.matches('.has-menu, .has-panel')) return;
    bolt.style.setProperty('--bx', `${15 + Math.random() * 70}%`);
    bolt.classList.remove('is-strike');
    void bolt.offsetWidth;
    bolt.classList.add('is-strike');
  };

  /* ───────── World + gate ───────── */
  const canvas = $<HTMLCanvasElement>('#world');
  const enter = (withSound: boolean, returning = false) => {
    gate.classList.add('is-gone');
    document.body.classList.add('is-in');
    window.setTimeout(() => (gate.hidden = true), reduced ? 0 : 700);
    setSound(withSound);
    // The phoenix intro plays on a fresh entry; not when returning or deep-linking into a place
    world?.enter(!returning && !location.hash);
    window.setTimeout(() => (route(), !world && drawer.hidden && openDrawer()), reduced ? 0 : 900);
  };
  const bar = $('#gate-bar');
  const pct = $('#gate-pct');
  /**
   * Loaded: the loading screen dissolves straight into the phoenix intro, no click needed.
   * Sound starts off (browsers block audio until the visitor interacts); the HUD toggle turns it on.
   */
  const ready = () => {
    bar.style.transform = 'scaleX(1)';
    pct.textContent = '';
    // Only a hop back from a case study skips the intro; any fresh load plays it
    let fromCase = false;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      fromCase = !!ref && ref.origin === location.origin && ref.pathname.startsWith('/work/');
    } catch {}
    window.setTimeout(() => enter(false, fromCase), fromCase || reduced ? 0 : 400);
  };
  /** Hold the loading screen until the phoenix has landed in memory, so the intro can always play */
  const readyWhenPhoenix = () => {
    pct.textContent = 'Summoning the phoenix…';
    const t0 = performance.now();
    const wait = () => {
      // Give up after 10 s on a very slow connection: enter without the intro
      if (!world || world.introReady() || performance.now() - t0 > 10000) ready();
      else requestAnimationFrame(wait);
    };
    wait();
  };

  // Let the gate paint before the (synchronous) island build
  requestAnimationFrame(() =>
    window.setTimeout(() => {
      try {
        world = createWorld(canvas, {
          reducedMotion: reduced,
          markers,
          onPick: (id) => (current === id ? close() : open(id)),
          onIntro: (playing) => document.body.classList.toggle('is-intro', playing),
          onIntroCut: () => {
            const cut = $('#intro-cut');
            cut.classList.remove('is-cut');
            void cut.offsetWidth;
            cut.classList.add('is-cut');
          },
          onPhoenix: () => {
            sound.screech();
            window.setTimeout(() => sound.thunder(0.4), 350);
          },
          onPhoenixHover: () => sound.blip('hover'),
          onHover: (id) => {
            markers.forEach((el, k) => el.classList.toggle('is-hover', k === id));
            if (id) sound.blip('hover');
          },
          // Headline steps aside once the visitor dives into the valley
          onMove: (_x, _z, dist) => document.body.classList.toggle('is-close', dist < 80),
          guardianTags: new Map(
            [...document.querySelectorAll<HTMLElement>('[data-guardian]')].map((el) => [el.dataset.guardian as 'turtle' | 'dragon', el])
          ),
          onGuardianHover: (g) => g && sound.blip('hover'),
          // Close strike: the clap lands almost with the flash
          onSummon: () => window.setTimeout(() => sound.thunder(1), 120),
          // Turtle answers with a bright chirp, the dragon with a low rumble
          onGuardian: (g) => (g === 'turtle' ? sound.blip('open') : sound.thunder(0.35)),
          onThunder: (strength, delay) => {
            strikeFlash();
            window.setTimeout(() => sound.thunder(strength), delay * 1000);
          },
        });
      } catch (err) {
        // No WebGL: the drawer becomes the way around
        console.warn('Overworld unavailable', err);
        document.body.classList.add('no-world');
      }
      readyWhenPhoenix();
    }, 60)
  );
}

