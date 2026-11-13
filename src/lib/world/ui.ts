/**
 * Overworld page wiring: entry gate (with or without sound), landmark markers,
 * the focus caption (title + View project over the scene), the detail panel
 * (cloned from hidden server-rendered sections), the places drawer, sound
 * toggle, keyboard and #hash deep links.
 */
import { createWorld, YAW, type World } from './world';
import { createSound } from './audio';
import { PLACES, ELEMENT_NAME, ELEMENTS } from './places';
import { installBrushMasks } from './brush';
import { wireJourney } from './journey';

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
  /** Guided tour state; the tour itself is wired further down */
  const tour = { on: false, i: 0, t: 0, paused: false, held: false, raf: 0, last: 0 };

  /* ───────── Focus: caption over the scene, detail panel on request ───────── */
  const caption = $('#caption');
  const capSub = $('#cap-sub');
  const capTitle = $('#cap-title');
  const capView = $<HTMLButtonElement>('#cap-view');
  let detail = false;
  const VIEW: Record<string, string> = { about: 'About me' };

  const fillPanel = (id: string) => {
    const tpl = document.querySelector(`.tpls [data-tpl="${id}"]`);
    if (!tpl) return;
    panelBody.replaceChildren(...[...tpl.childNodes].map((n) => n.cloneNode(true)));
    panelBody.scrollTop = 0;
    const i = ids.indexOf(id);
    panelCount.textContent = `${String(i + 1).padStart(2, '0')} / ${String(ids.length).padStart(2, '0')}`;
    panelBody.append(nextBlock(ids[(i + 1) % ids.length]));
    panelBody.querySelectorAll<HTMLElement>('.pv-live').forEach(wireLive);
    panelBody.querySelectorAll<HTMLElement>('.pv-journey').forEach((j) => wireJourney(j, panelBody));
  };
  /** Live preview: load the site once the sheet has faded in, and only let it take the pointer after a click */
  const wireLive = (live: HTMLElement) => {
    const frame = live.querySelector('iframe')!;
    frame.addEventListener('load', () => live.classList.add('is-loaded'), { once: true });
    // Booting a whole site mid-transition stalls the fade; skip if the visitor already left or stepped on
    window.setTimeout(() => detail && frame.isConnected && (frame.src = frame.dataset.src!), reduced ? 0 : 650);
    live.querySelector('.pv-live-cover')!.addEventListener('click', () => {
      live.classList.add('is-live');
      frame.tabIndex = 0;
      frame.focus();
    });
    live.addEventListener('pointerleave', () => live.classList.remove('is-live'));
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
    world?.setBackdrop(true);
    requestAnimationFrame(() => panel.classList.add('is-open'));
    panelBody.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };
  const hideDetail = (backOut = true) => {
    if (!detail) return;
    detail = false;
    document.body.classList.remove('has-panel');
    world?.setBackdrop(false);
    panel.classList.remove('is-open');
    window.setTimeout(() => {
      if (detail) return;
      panel.hidden = true;
      // Stop any live preview so its site isn't running behind the valley
      panelBody.querySelectorAll('iframe').forEach((f) => (f.src = 'about:blank'));
    }, reduced ? 0 : 320);
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
    setMe(false);
    current = id;
    capSub.textContent = `${place.sub} · ${ELEMENT_NAME[place.element]}`;
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
    markVisited(id);
    cancelAnimationFrame(diveAnim);
    world?.focus(id, portalImage(id));
    // Stepping prev / next from inside a portal lands you inside the next one
    setDive(detail ? 1 : 0);
    sound.blip('open');
    // Arriving at a beacon: its element answers (crackle, trickle, rumble, gust)
    sound.element(place.element);
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

  /* Journey project cards: leave the panel, fly to that beacon, then dive into it */
  panelBody.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLElement>('a[data-place]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const id = a.dataset.place!;
    hideDetail(false);
    open(id);
    // Let the camera arrive before diving in; skip if the visitor has moved on
    window.setTimeout(() => current === id && !detail && enterPortal(), reduced ? 0 : 1100);
  });

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
      // The tour layer handles its own scroll and swipe
      if (tour.on) return;
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
      // The tour layer handles its own scroll and swipe
      if (tour.on) return;
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
    setMe(false);
    drawer.hidden = false;
    document.body.classList.add('has-menu');
    world?.setBackdrop(true);
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    listBtns.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    drawer.querySelector<HTMLElement>('.menu-row')?.focus({ preventScroll: true });
  };
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('has-menu');
    world?.setBackdrop(false);
    // Fold everything once the menu has faded, so it reopens as a clean list
    window.setTimeout(() => !drawer.classList.contains('is-open') && ((drawer.hidden = true), foldAll()), reduced ? 0 : 400);
    listBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  listBtns.forEach((b) => b.addEventListener('click', () => (drawer.hidden ? openDrawer(b) : closeDrawer())));
  $('#menu-close').addEventListener('click', () => (closeDrawer(), drawerFrom.focus({ preventScroll: true })));
  drawer.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-place]');
    if (b) return open(b.dataset.place!, drawerFrom);
    const row = (e.target as Element).closest<HTMLElement>('[data-row]');
    if (row) return toggleRow(row);
    // Gallery thumbs swap the fold's main shot
    const thumb = (e.target as Element).closest<HTMLElement>('[data-shot]');
    if (thumb) pickShot(thumb);
  });

  /* Accordion: one row unfolds at a time */
  const menuList = drawer.querySelector<HTMLElement>('.menu-list')!;
  const menuRows = [...drawer.querySelectorAll<HTMLElement>('.menu-row')];
  const setRow = (row: HTMLElement, on: boolean) => {
    row.setAttribute('aria-expanded', String(on));
    row.parentElement!.classList.toggle('is-open', on);
  };
  const foldAll = () => {
    menuRows.forEach((r) => setRow(r, false));
    menuList.classList.remove('has-open');
  };
  function toggleRow(row: HTMLElement) {
    const on = row.getAttribute('aria-expanded') !== 'true';
    foldAll();
    if (!on) return void sound.blip('close');
    setRow(row, true);
    menuList.classList.add('has-open');
    sound.blip('open');
    // Once the fold has opened (and the previous one closed), bring the whole item into view
    window.setTimeout(() => row.parentElement!.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }), reduced ? 0 : 720);
  }
  /* Accordion keys: ↑ / ↓ walk the headers, Home / End jump to the ends */
  menuList.addEventListener('keydown', (e) => {
    const i = menuRows.indexOf(e.target as HTMLElement);
    if (i < 0) return;
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: menuRows.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    menuRows[(to + menuRows.length) % menuRows.length].focus();
  });
  menuRows.forEach((row) => row.addEventListener('pointerenter', () => sound.blip('hover')));

  function pickShot(thumb: HTMLElement) {
    const fold = thumb.closest('.fold')!;
    const img = fold.querySelector<HTMLImageElement>('.fold-shot img');
    if (!img || img.getAttribute('src') === thumb.dataset.shot) return;
    fold.querySelectorAll('[data-shot]').forEach((t) => t.setAttribute('aria-pressed', String(t === thumb)));
    // Cross-fade: dip the shot, swap, let it settle back
    img.classList.add('is-swapping');
    window.setTimeout(() => {
      img.src = thumb.dataset.shot!;
      img.decode().catch(() => {}).finally(() => img.classList.remove('is-swapping'));
    }, reduced ? 0 : 220);
  }

  /* The open shot leans toward the pointer, a pane of glass catching the light */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    drawer.addEventListener('pointermove', (e) => {
      const shot = (e.target as Element).closest<HTMLElement>('.menu-item.is-open .fold-shot');
      if (!shot) return;
      const r = shot.getBoundingClientRect();
      shot.style.setProperty('--tx', String((e.clientX - r.left) / r.width - 0.5));
      shot.style.setProperty('--ty', String((e.clientY - r.top) / r.height - 0.5));
    });
    drawer.addEventListener('pointerout', (e) => {
      const shot = (e.target as Element).closest<HTMLElement>('.fold-shot');
      if (shot && !shot.contains(e.relatedTarget as Node)) (shot.style.setProperty('--tx', '0'), shot.style.setProperty('--ty', '0'));
    });
  }

  /* ───────── Nav, markers, sound ───────── */
  document.querySelectorAll<HTMLElement>('[data-open]').forEach((b) => b.addEventListener('click', () => open(b.dataset.open!, b)));

  /* Me: the foot-bar pill unfolds into the profile + contact card */
  const profile = $('#profile');
  const mePill = $<HTMLButtonElement>('#me-pill');
  let meOpen = false;
  let meTimer = 0;
  const setMe = (on: boolean) => {
    if (on === meOpen) return;
    meOpen = on;
    clearTimeout(meTimer);
    mePill.setAttribute('aria-expanded', String(on));
    document.body.classList.toggle('has-me', on);
    if (on) {
      profile.hidden = false;
      requestAnimationFrame(() => profile.classList.add('is-open'));
    } else {
      profile.classList.remove('is-open', 'is-ping');
      meTimer = window.setTimeout(() => (profile.hidden = true), reduced ? 0 : 600);
    }
    sound.blip(on ? 'open' : 'close');
  };
  mePill.addEventListener('click', () => setMe(!meOpen));
  // Anywhere else folds it away (the Contact link opens it, so it doesn't count)
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Element;
    if (meOpen && !t.closest('.me, #nav-contact')) setMe(false);
  });
  /* Contact: clear anything in front, unfold the card and draw the eye to the email */
  const showContact = () => {
    closeDrawer();
    if (current) close();
    world?.overview();
    setMe(true);
    profile.classList.remove('is-ping');
    void profile.offsetWidth;
    profile.classList.add('is-ping');
    window.setTimeout(() => $('#profile-mail').focus({ preventScroll: true }), reduced ? 0 : 350);
  };
  $('#nav-contact').addEventListener('click', showContact);
  $('#nav-home').addEventListener('click', () => (close(), world?.overview()));
  markers.forEach((el, id) => {
    el.addEventListener('click', () => (current === id ? close() : open(id, el)));
    el.addEventListener('pointerenter', () => (world?.setHover(id), sound.blip('hover')));
    el.addEventListener('pointerleave', () => world?.setHover(null));
  });

  /* ───────── Hero: rotating word, way in, and the index that lights its beacon ───────── */
  // Every element that stands for a beacon: hero chips, featured rows, minimap dots (several per beacon)
  const beaconEls = [...document.querySelectorAll<HTMLElement>('[data-beacon]')];
  const forBeacons = (fn: (el: HTMLElement, id: string) => void) => beaconEls.forEach((el) => fn(el, el.dataset.beacon!));
  /** One beacon lit from the HUD side: index chip, marker label, glow in the valley */
  const hoverBeacon = (id: string | null) => {
    world?.setHover(id);
    markers.forEach((el, k) => el.classList.toggle('is-hover', k === id));
    forBeacons((el, k) => el.classList.toggle('is-hover', k === id));
  };
  forBeacons((el, id) => {
    el.addEventListener('click', () => open(id, el));
    el.addEventListener('pointerenter', () => (hoverBeacon(id), sound.blip('hover')));
    el.addEventListener('pointerleave', () => hoverBeacon(null));
    el.addEventListener('focus', () => hoverBeacon(id));
    el.addEventListener('blur', () => hoverBeacon(null));
  });
  /* Beacons lit: every place opened stays lit on this device, counted in the hero index */
  const LIT_KEY = 'valley-lit';
  const litCount = $('#hero-lit-n');
  const litBox = $('#hero-lit');
  let lit = new Set<string>();
  try {
    lit = new Set((JSON.parse(localStorage.getItem(LIT_KEY) ?? '[]') as string[]).filter((id) => ids.includes(id)));
  } catch {}
  const showLit = () => {
    forBeacons((el, k) => el.classList.toggle('is-lit', lit.has(k)));
    litCount.textContent = String(lit.size).padStart(2, '0');
    if (lit.size === ids.length) litBox.textContent = 'Valley cleared ✦';
    world?.setVisited(lit);
  };
  function markVisited(id: string) {
    if (lit.has(id)) return;
    lit.add(id);
    try {
      localStorage.setItem(LIT_KEY, JSON.stringify([...lit]));
    } catch {}
    showLit();
    if (lit.size === ids.length) litBox.classList.add('is-cleared');
  }
  showLit();

  /**
   * Fit the hero above the foot bar: measure, and while it would overlap, step back the next
   * least-important part (valley chips → subline → featured list → element row). Re-run on resize.
   */
  const hero = document.querySelector<HTMLElement>('.headline');
  const footGuard = document.querySelector<HTMLElement>('.foot-left');
  const fitHero = () => {
    if (!hero || !footGuard) return;
    for (let k = 1; k <= 4; k++) hero.classList.remove(`fit-${k}`);
    // Phones lay the hero out from the bottom; their own rules handle it
    if (matchMedia('(max-width: 760px)').matches) return;
    const limit = footGuard.getBoundingClientRect().top - 24;
    for (let k = 1; k <= 4 && hero.getBoundingClientRect().bottom > limit; k++) hero.classList.add(`fit-${k}`);
  };
  let fitRaf = 0;
  window.addEventListener('resize', () => (cancelAnimationFrame(fitRaf), (fitRaf = requestAnimationFrame(fitHero))));
  fitHero();
  // Web fonts change line heights once they land
  void document.fonts?.ready.then(fitHero);

  // Starts at the first featured project's beacon: the valley is the work
  const firstStop = PLACES.find((p) => p.featured)?.id ?? ids[1] ?? ids[0];
  $('#hero-explore').addEventListener('click', (e) => open(firstStop, e.currentTarget as HTMLElement));
  const heroProjects = $<HTMLButtonElement>('#hero-projects');
  heroProjects.addEventListener('click', () => openDrawer(heroProjects));

  /**
   * Swap the hero's last word: the old one lifts away into a blur, the new one settles up out of it.
   * Only real words are ever on screen. A new swap cancels the last; a hidden tab just gets the word.
   */
  const heroWord = $('#hero-word');
  let swapOut: Animation | null = null;
  let swapIn: Animation | null = null;
  const decode = (to: string) => {
    swapOut?.cancel();
    swapIn?.cancel();
    if (document.hidden || reduced || !heroWord.animate) return void (heroWord.textContent = to);
    swapOut = heroWord.animate(
      [
        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' },
        { opacity: 0, filter: 'blur(8px)', transform: 'translateY(-0.16em)' },
      ],
      { duration: 280, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }
    );
    swapOut.onfinish = () => {
      heroWord.textContent = to;
      swapOut?.cancel();
      swapIn = heroWord.animate(
        [
          { opacity: 0, filter: 'blur(8px)', transform: 'translateY(0.2em)' },
          { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' },
        ],
        { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
    };
  };
  // Leaving or returning to the tab: drop any half-done swap and show the real word
  document.addEventListener('visibilitychange', () => {
    swapOut?.cancel();
    swapIn?.cancel();
    if (heroWord.dataset.text) heroWord.textContent = heroWord.dataset.text;
  });
  /* Elements: the headline's word belongs to one element at a time, and that element's beacons stir in the valley */
  const elButtons = [...document.querySelectorAll<HTMLElement>('[data-element]')];
  let elTurn = 0;
  let elHold: string | null = null;
  const showElement = (id: string, animate = !reduced) => {
    const e = ELEMENTS.find((k) => k.id === id);
    if (!e) return;
    heroWord.dataset.el = id;
    if (heroWord.dataset.text !== e.word) {
      heroWord.dataset.text = e.word;
      animate ? decode(e.word) : (heroWord.textContent = e.word);
    }
    elButtons.forEach((b) => b.classList.toggle('is-on', b.dataset.element === id));
    forBeacons((el, k) => el.classList.toggle('is-el', PLACES.find((p) => p.id === k)?.element === id));
    world?.setElement(id);
  };
  const overviewShown = () =>
    !document.hidden && document.body.classList.contains('is-in') && !document.body.matches('.has-focus, .has-menu, .has-panel, .is-intro, .is-close');
  elButtons.forEach((b) => {
    const id = b.dataset.element!;
    const hold = () => ((elHold = id), showElement(id), sound.element(id));
    const free = () => {
      elHold = null;
      showElement(ELEMENTS[elTurn].id);
    };
    b.addEventListener('pointerenter', hold);
    // Keyboard focus only: the browser re-focusing a clicked button when the tab comes back shouldn't hold the word
    b.addEventListener('focus', () => b.matches(':focus-visible') && hold());
    b.addEventListener('pointerleave', () => elHold === id && free());
    b.addEventListener('blur', () => elHold === id && free());
    // Click: fly to the element's beacons in turn, featured first; each click moves on to the next
    const round = PLACES.filter((p) => p.element === id).sort((a, c) => Number(!!c.featured) - Number(!!a.featured));
    let stop = 0;
    b.addEventListener('click', () => {
      if (!round.length) return;
      const to = round[stop % round.length];
      stop++;
      open(to.id, b);
    });
  });
  // Leaving the overview settles the valley; coming back resumes the current element
  const settleElements = () => {
    // The tour sets its own element per stop
    if (tour.on) return;
    world?.setElement(overviewShown() ? elHold ?? ELEMENTS[elTurn].id : null);
  };
  new MutationObserver(settleElements).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  showElement(ELEMENTS[0].id, false);
  if (!reduced) {
    window.setInterval(() => {
      if (!overviewShown() || elHold) return;
      elTurn = (elTurn + 1) % ELEMENTS.length;
      showElement(ELEMENTS[elTurn].id);
    }, 3600);
  }

  /* ───────── Guided tour: letterboxed, one beacon after another ─────────
     Each stop: the camera flies in and slowly pushes toward the portal while swaying round it;
     the project's live site loads in a browser window beside its credits (or its screens cross-fade there). */
  type Stop = {
    id: string; n: string; title: string; kind: string; year: string; summary: string; stack: string[]; image: string;
    url: string | null; shots: string[]; features: string[]; highlights: { value: string; label: string }[]; glyph: string;
    element: string; elementName: string; color: string; paint: string; featured: boolean;
  };
  const stops = JSON.parse($('#tour-data').textContent || '[]') as Stop[];
  const tourEl = $('#tour');
  const tourPause = $<HTMLButtonElement>('#tour-pause');
  const segs = [...document.querySelectorAll<HTMLElement>('.tour-seg')];
  const segFill = segs.map((s) => s.firstElementChild as HTMLElement);
  const screen = $('#tour-screen');
  const shotA = $<HTMLImageElement>('#tour-img');
  const shotB = $<HTMLImageElement>('#tour-img-b');
  const frame = $<HTMLIFrameElement>('#tour-frame');
  /** A stop with a live site plays longer: there's more to watch */
  const stopMs = () => (stops[tour.i]?.url && screen.classList.contains('is-loaded') ? 12000 : 8000);
  /** Camera push toward the portal over a stop, after the flight in has landed */
  const TOUR_DIVE = 0.34;
  /** Live sites only where there's headroom: not on phones, reduced data or the low-quality valley */
  const liveOk = () =>
    !matchMedia('(max-width: 760px)').matches &&
    !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData &&
    world?.quality() !== 'low';
  let frameTimer = 0;
  let slideTimer = 0;
  /** Fit the 1440×900 desktop render into the window, whatever its size */
  const fitFrame = () => screen.style.setProperty('--s', String(screen.clientWidth / 1440));
  new ResizeObserver(fitFrame).observe(screen);
  const unloadFrame = () => {
    clearTimeout(frameTimer);
    if (frame.getAttribute('src') !== 'about:blank') frame.src = 'about:blank';
    screen.classList.remove('is-loaded', 'is-loading', 'is-live');
  };
  frame.addEventListener('load', () => {
    if (frame.src !== 'about:blank' && screen.classList.contains('is-loading')) {
      screen.classList.remove('is-loading');
      screen.classList.add('is-loaded');
    }
  });
  /** Screens cross-fading between two stacked images (projects without a live site) */
  const slideshow = (shots: string[]) => {
    clearInterval(slideTimer);
    shotA.src = shots[0] ?? '';
    shotB.src = '';
    screen.classList.remove('is-b');
    if (shots.length < 2 || reduced) return;
    let k = 0;
    slideTimer = window.setInterval(() => {
      if (tour.paused || tour.held) return;
      k = (k + 1) % shots.length;
      const showB = !screen.classList.contains('is-b');
      (showB ? shotB : shotA).src = shots[k];
      screen.classList.toggle('is-b', showB);
    }, 2600);
  };
  const listItems = (ul: HTMLElement, items: string[]) =>
    ul.replaceChildren(
      ...items.map((t) => {
        const li = document.createElement('li');
        li.textContent = t;
        return li;
      })
    );
  const showStop = (i: number) => {
    tour.i = (i + stops.length) % stops.length;
    tour.t = 0;
    const s = stops[tour.i];
    const next = stops[tour.i + 1];
    open(s.id);
    world?.setElement(s.element === 'spirit' ? null : s.element);
    const chapter = String(tour.i + 1).padStart(2, '0');
    $('#tour-n').textContent = chapter;
    $('#tour-ghost').textContent = chapter;
    $('#tour-el').textContent = `${s.elementName}${s.featured ? ' · Featured' : ''}`;
    $('#tour-glyph').setAttribute('d', s.glyph);
    $('#tour-kind').textContent = `${s.n} · ${s.kind}`;
    $('#tour-title').textContent = s.title;
    $('#tour-year').textContent = s.year;
    $('#tour-type').textContent = s.kind;
    $('#tour-elname').textContent = s.elementName;
    $('#tour-sum').textContent = s.summary;
    // Headline numbers when the project has them, otherwise its top features
    const feats = $('#tour-feats');
    if (s.highlights.length) {
      feats.classList.add('is-numbers');
      feats.replaceChildren(
        ...s.highlights.slice(0, 3).map((h) => {
          const li = document.createElement('li');
          const b = document.createElement('b');
          b.textContent = h.value;
          li.append(b, document.createTextNode(h.label));
          return li;
        })
      );
    } else {
      feats.classList.remove('is-numbers');
      listItems(feats, s.features);
    }
    listItems($('#tour-stack'), s.stack);
    $('#tour-upnext').textContent = next ? `Up next — ${next.title}` : 'Last stop — back to the valley';
    tourEl.style.setProperty('--paint', s.paint);
    tourEl.style.setProperty('--el', s.color);
    // Chapters: earlier ones full, later ones empty, this one fills as it plays
    segFill.forEach((f, k) => f.style.setProperty('--fill', k < tour.i ? '100%' : '0%'));
    segs.forEach((sg, k) => sg.toggleAttribute('aria-current', k === tour.i));

    // The window: the live site if there is one (its screenshot holds the frame until it arrives)
    if (screen.classList.contains('is-live')) setLive(false);
    unloadFrame();
    slideshow(s.shots.length ? s.shots : [s.image]);
    const live = !!s.url && liveOk();
    screen.classList.toggle('has-live', live);
    $('#tour-url').textContent = s.url ? s.url.replace(/^https?:\/\/|\/$/g, '') : `${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.local`;
    $('#tour-live-label').textContent = s.url ? 'Live' : s.shots.length > 1 ? `${s.shots.length} screens` : 'Preview';
    $('#tour-live').classList.toggle('is-on', !!s.url);
    $('#tour-tc').textContent = s.url ? 'Running live — the real site, not a recording' : 'Screens from the project';
    frame.title = `${s.title} live site`;
    if (live) {
      // Load after the camera has landed, so the flight stays smooth
      frameTimer = window.setTimeout(() => {
        if (!tour.on || stops[tour.i].id !== s.id) return;
        screen.classList.add('is-loading');
        frame.src = s.url!;
      }, reduced ? 0 : 900);
    }
    // Restart the entrance: window swings in, credits rise
    tourEl.classList.remove('is-cut');
    void tourEl.offsetWidth;
    tourEl.classList.add('is-cut');
    fitFrame();
  };
  const tourTick = (now: number) => {
    if (!tour.on) return;
    const dt = Math.min(now - tour.last, 100);
    tour.last = now;
    // Paused by hand, or held while the visitor reads the window or the credits
    if (!tour.paused && !tour.held && !document.hidden) tour.t += dt;
    const ms = stopMs();
    const k = Math.min(1, tour.t / ms);
    segFill[tour.i].style.setProperty('--fill', `${(k * 100).toFixed(2)}%`);
    // Push in once the flight has landed (~1.4 s), easing toward the portal until the cut
    if (!detail && !reduced) {
      const p = Math.min(1, Math.max(0, (tour.t - 1400) / (ms - 2000)));
      setDive(TOUR_DIVE * p * p * (3 - 2 * p));
    }
    if (tour.t >= ms) {
      if (tour.i === stops.length - 1) return void endTour();
      showStop(tour.i + 1);
    }
    tour.raf = requestAnimationFrame(tourTick);
  };
  const setPaused = (on: boolean) => {
    tour.paused = on;
    tourPause.setAttribute('aria-pressed', String(on));
    tourPause.textContent = on ? 'Play' : 'Pause';
    tourEl.classList.toggle('is-paused', on && !screen.classList.contains('is-live'));
  };
  const tourStep = (d: number) => {
    if (d > 0 && tour.i === stops.length - 1) return;
    if (d < 0 && tour.i === 0) return;
    showStop(tour.i + d);
  };
  const startTour = () => {
    if (!world || tour.on) return;
    closeDrawer();
    setMe(false);
    if (detail) hideDetail(false);
    tour.on = true;
    tour.held = false;
    setPaused(false);
    document.body.classList.add('is-tour');
    tourEl.hidden = false;
    world.setDrift(true);
    tour.last = performance.now();
    showStop(0);
    tour.raf = requestAnimationFrame(tourTick);
    $<HTMLButtonElement>('#tour-pause').focus({ preventScroll: true });
  };
  /** `stay`: keep the current place framed (Open project); otherwise back to the overview */
  function endTour(stay = false) {
    if (!tour.on) return;
    tour.on = false;
    cancelAnimationFrame(tour.raf);
    clearInterval(slideTimer);
    unloadFrame();
    document.body.classList.remove('is-tour');
    tourEl.classList.remove('is-cut', 'is-paused');
    tourEl.hidden = true;
    world?.setDrift(false);
    if (!stay) {
      close();
      world?.overview();
      $<HTMLButtonElement>('#hero-tour').focus({ preventScroll: true });
    }
    settleElements();
  }
  /* Try it live: the site takes the pointer and the tour waits; Back hands it back */
  const setLive = (on: boolean) => {
    screen.classList.toggle('is-live', on);
    tourEl.classList.toggle('is-interacting', on);
    frame.tabIndex = on ? 0 : -1;
    setPaused(on);
    if (on) frame.focus();
  };
  $('#tour-interact').addEventListener('click', () => setLive(true));
  $('#tour-back').addEventListener('click', () => setLive(false));
  $('#hero-tour').addEventListener('click', startTour);
  $('#tour-exit').addEventListener('click', () => endTour());
  $('#tour-next').addEventListener('click', () => (tour.i === stops.length - 1 ? endTour() : showStop(tour.i + 1)));
  $('#tour-prev').addEventListener('click', () => tourStep(-1));
  tourPause.addEventListener('click', () => (screen.classList.contains('is-live') ? setLive(false) : setPaused(!tour.paused)));
  $('#tour-view').addEventListener('click', () => {
    endTour(true);
    enterPortal();
  });
  segs.forEach((sg, k) => sg.addEventListener('click', () => showStop(k)));

  /* The tour layer takes every input, so nothing stray reaches the valley and ends it:
     a click on open space pauses / plays, a scroll or swipe steps one stop, only End tour or Esc leave */
  tourEl.addEventListener('click', (e) => {
    if ((e.target as Element).closest('button, a, .tour-card, .tour-stage')) return;
    if (screen.classList.contains('is-live')) return void setLive(false);
    setPaused(!tour.paused);
  });
  // Reading: holding the pointer over the window or the credits holds the clock
  document.querySelectorAll<HTMLElement>('.tour-card, .tour-stage').forEach((el) => {
    el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && (tour.held = true));
    el.addEventListener('pointerleave', () => (tour.held = false));
  });  let wheelSum = 0;
  let wheelLock = 0;
  tourEl.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const now = performance.now();
      // One flick, one stop: gather the gesture, then ignore the trackpad's tail for a moment
      if (now < wheelLock) return;
      wheelSum += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(wheelSum) < 60) return;
      tourStep(wheelSum > 0 ? 1 : -1);
      wheelSum = 0;
      wheelLock = now + 900;
    },
    { passive: false }
  );
  let swipe: { x: number; y: number } | null = null;
  tourEl.addEventListener('touchstart', (e) => (swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY }), { passive: true });
  tourEl.addEventListener(
    'touchend',
    (e) => {
      if (!swipe) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipe.x;
      const dy = t.clientY - swipe.y;
      swipe = null;
      // Left or up goes forward, right or down goes back; short drags count as taps
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;
      tourStep(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : -1) : dy < 0 ? 1 : -1);
    },
    { passive: true }
  );

  /* ───────── Minimap: the spiral from above, turned so "up" is where the camera faces ───────── */
  {
    const sy = Math.sin(YAW);
    const cy = Math.cos(YAW);
    $('#map-rot').setAttribute('transform', `matrix(${cy} ${sy} ${-sy} ${cy} 0 0)`);
    document.querySelectorAll<HTMLElement>('.map-dot').forEach((d) => {
      const x = Number(d.dataset.x);
      const z = Number(d.dataset.z);
      d.style.left = `${50 + ((cy * x - sy * z) / 180) * 100}%`;
      d.style.top = `${50 + ((sy * x + cy * z) / 180) * 100}%`;
    });
  }
  const mapView = document.getElementById('map-view');
  const yawDeg = (-YAW * 180) / Math.PI;
  let mapLast = '';
  /** Called every frame with the camera's target: moves the view marker (only when it actually moved) */
  const updateMap = (x: number, z: number, dist: number) => {
    const t = `translate(${x.toFixed(1)} ${z.toFixed(1)}) rotate(${yawDeg.toFixed(2)}) scale(${Math.min(1.6, Math.max(0.35, dist / 150)).toFixed(2)})`;
    if (t !== mapLast && mapView) mapView.setAttribute('transform', (mapLast = t));
  };

  const setSound = (on: boolean) => {
    sound.setOn(on);
    soundBtn.setAttribute('aria-pressed', String(on));
    $('#sound-state').textContent = on ? 'on' : 'off';
  };
  soundBtn.addEventListener('click', () => setSound(!sound.on));

  /* Day / night: the visitor can flip it whenever they like; the choice is remembered on this device */
  const skyBtn = $<HTMLButtonElement>('#nav-sky');
  const SKY_KEY = 'valley-sky';
  let isDay = false;
  try {
    isDay = localStorage.getItem(SKY_KEY) === 'day';
  } catch {}
  const setDay = (on: boolean, instant = false) => {
    isDay = on;
    document.body.classList.toggle('is-day', on);
    skyBtn.setAttribute('aria-pressed', String(on));
    skyBtn.setAttribute('aria-label', on ? 'Switch to night' : 'Switch to day');
    world?.setDay(on, instant);
    try {
      localStorage.setItem(SKY_KEY, on ? 'day' : 'night');
    } catch {}
  };
  skyBtn.addEventListener('click', () => (setDay(!isDay), sound.blip(isDay ? 'open' : 'close')));
  setDay(isDay, true);

  /* ───────── Referral reviews: rotate on their own, pause while hovered or focused ───────── */
  const reviews = [...document.querySelectorAll<HTMLElement>('[data-review]')];
  const reviewsBox = $('#reviews');
  const reviewsCount = $('#reviews-count');
  let review = 0;
  let reviewHold = false;
  const showReview = (d: number) => {
    reviews[review].hidden = true;
    review = (review + d + reviews.length) % reviews.length;
    reviews[review].hidden = false;
    reviewsCount.textContent = `${String(review + 1).padStart(2, '0')} / ${String(reviews.length).padStart(2, '0')}`;
  };
  $('#reviews-prev').addEventListener('click', () => (showReview(-1), sound.blip('hover')));
  $('#reviews-next').addEventListener('click', () => (showReview(1), sound.blip('hover')));
  ['pointerenter', 'focusin'].forEach((ev) => reviewsBox.addEventListener(ev, () => (reviewHold = true)));
  ['pointerleave', 'focusout'].forEach((ev) => reviewsBox.addEventListener(ev, () => (reviewHold = false)));
  if (!reduced && reviews.length > 1) {
    window.setInterval(() => {
      // Only turn the page while the overview is actually on screen
      const away = document.hidden || document.body.matches('.has-focus, .has-menu, .has-panel, .is-intro, .is-close');
      if (!reviewHold && !away) showReview(1);
    }, 9000);
  }

  /* ───────── Keyboard ───────── */
  const PAN: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1],
  };
  /* Any input during the intro fast-forwards it into the home view */
  const skip = () => world?.playingIntro() && world.skipIntro();
  ['pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, skip, { passive: true }));

  window.addEventListener('keydown', (e) => {
    if (world?.playingIntro()) return void skip();
    // Tour keys: ← → step, Space pauses, Escape ends; everything else is ignored while it rolls
    if (tour.on) {
      // Esc first hands a live site back to the tour, then ends the tour
      if (e.key === 'Escape') tourEl.classList.contains('is-interacting') ? $('#tour-back').click() : endTour();
      else if (e.key === 'ArrowRight') (e.preventDefault(), tour.i === stops.length - 1 ? endTour() : showStop(tour.i + 1));
      else if (e.key === 'ArrowLeft') (e.preventDefault(), tourStep(-1));
      else if (e.key === ' ' && !(e.target as Element).closest('button')) (e.preventDefault(), setPaused(!tour.paused));
      return;
    }
    // Escape peels one layer at a time: drawer → detail panel → focused place
    if (e.key === 'Escape') {
      if (meOpen) return void (setMe(false), mePill.focus({ preventScroll: true }));
      return void (!drawer.hidden ? closeDrawer() : detail ? hideDetail() : close());
    }
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
    else if (h === 'contact') showContact();
  };
  // In-page /#id links (replaceState in open() doesn't fire this, so no loop)
  window.addEventListener('hashchange', route);

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
  const num = $('#gate-num');
  /** Progress eases toward `target` and creeps toward `ceil` meanwhile, so the ridge never stalls */
  const load = { shown: 0, target: 0.12, ceil: 0.45 };
  const drawLoad = () => {
    if (gate.hidden) return;
    load.target = Math.min(Math.max(load.target, load.target + (load.ceil - load.target) * 0.004), 1);
    load.shown += (load.target - load.shown) * (reduced ? 1 : 0.07);
    bar.style.strokeDashoffset = String(1 - load.shown);
    num.textContent = String(Math.round(load.shown * 100)).padStart(2, '0');
    requestAnimationFrame(drawLoad);
  };
  drawLoad();
  /**
   * Loaded: the loading screen dissolves straight into the phoenix intro, no click needed.
   * Sound starts off (browsers block audio until the visitor interacts); the HUD toggle turns it on.
   */
  const ready = () => {
    load.target = load.ceil = 1;
    gate.classList.add('is-ready');
    pct.textContent = 'Above the mist';
    // Only a hop back from a case study skips the intro; any fresh load plays it
    let fromCase = false;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      fromCase = !!ref && ref.origin === location.origin && /^\/(work|journey)\//.test(ref.pathname);
    } catch {}
    // A beat for the ridge to finish and the beacon to light
    window.setTimeout(() => enter(false, fromCase), fromCase || reduced ? 0 : 900);
  };
  /** Hold the loading screen until the phoenix has landed in memory, so the intro can always play */
  const readyWhenPhoenix = () => {
    load.target = Math.max(load.target, 0.6);
    load.ceil = 0.94;
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
            // Hovering a light in the valley lights its name in the hero index too
            forBeacons((el, k) => el.classList.toggle('is-hover', k === id));
            if (id) sound.blip('hover');
          },
          // Headline steps aside once the visitor dives into the valley
          onMove: (x, z, dist) => {
            document.body.classList.toggle('is-close', dist < 80);
            updateMap(x, z, dist);
          },
          onQuality: (level) => document.body.classList.toggle('is-lowq', level === 'low'),
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
        // Open on whichever sky the visitor left it at
        world.setDay(isDay, true);
        world.setVisited(lit);
      } catch (err) {
        // No WebGL: the drawer becomes the way around
        console.warn('Overworld unavailable', err);
        document.body.classList.add('no-world');
      }
      readyWhenPhoenix();
    }, 60)
  );
}

