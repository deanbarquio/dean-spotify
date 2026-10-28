/**
 * Journey timeline in the about panel. The section pins inside the panel's
 * scroller and vertical scroll drives the card track sideways, so scrolling
 * the page is travelling the timeline. Cards tilt away from the centre; the
 * centred card is the focus and its year and era line are ghosted large
 * behind the track. Arrow keys, dots and prev / next travel by scrolling the
 * panel to that card's point, so everything stays in sync. Clicking a card
 * opens its page.
 */
export function wireJourney(root: HTMLElement, scroller: HTMLElement) {
  const pin = root.querySelector<HTMLElement>('.jr-pin')!;
  const track = root.querySelector<HTMLElement>('.jr-track')!;
  const items = [...track.querySelectorAll<HTMLElement>('.jr-item')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('.jr-dot')];
  const ghostYear = root.querySelector<HTMLElement>('.jr-ghost-year')!;
  const ghostEra = root.querySelector<HTMLElement>('.jr-ghost-era')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = -1;
  let frame = 0;
  let idle = 0;
  /** Horizontal travel available, which is also the extra vertical runway the section gets */
  let travel = 0;

  const centreOf = (li: HTMLElement) => li.offsetLeft + li.offsetWidth / 2;
  /** Where the pin starts, in the scroller's scroll coordinates */
  const start = () => root.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    items.forEach((li, k) => {
      li.classList.toggle('is-active', k === i);
      li.querySelector('.jr-card')!.toggleAttribute('aria-current', k === i);
    });
    dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === i)));
    ghostYear.textContent = items[i].dataset.year!;
    ghostEra.textContent = items[i].dataset.era!;
    // Restart the ghost's fade so each new year drifts in
    const ghost = ghostYear.parentElement!;
    ghost.classList.remove('is-in');
    void ghost.offsetWidth;
    ghost.classList.add('is-in');
  };

  /** Map scroll progress through the pinned runway to the track, then tilt each card by its distance from centre */
  const sync = () => {
    frame = 0;
    const p = travel ? Math.max(0, Math.min(1, (scroller.scrollTop - start()) / travel)) : 0;
    track.scrollLeft = p * travel;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    items.forEach((li, k) => {
      const d = Math.max(-3, Math.min(3, (centreOf(li) - mid) / li.offsetWidth));
      li.style.setProperty('--d', d.toFixed(3));
      li.style.setProperty('--ad', Math.abs(d).toFixed(3));
      if (Math.abs(d) < bestD) (bestD = Math.abs(d)), (best = k);
    });
    setActive(best);
    return p;
  };

  const layout = () => {
    travel = Math.max(0, track.scrollWidth - track.clientWidth);
    root.style.height = `${pin.offsetHeight + travel}px`;
    sync();
  };

  const go = (i: number, smooth = !reduced) => {
    const k = Math.max(0, Math.min(items.length - 1, i));
    const left = Math.max(0, Math.min(travel, centreOf(items[k]) - track.clientWidth / 2));
    scroller.scrollTo({ top: start() + left, behavior: smooth ? 'smooth' : 'auto' });
  };

  // The panel scroller outlives this content, so listeners drop themselves once it's swapped out
  const onScroll = () => {
    if (!root.isConnected) return void (scroller.removeEventListener('scroll', onScroll), ro.disconnect());
    frame ||= requestAnimationFrame(() => {
      const p = sync();
      // When scrolling rests mid-journey, settle onto the nearest card
      clearTimeout(idle);
      if (p > 0 && p < 1) idle = window.setTimeout(() => go(active), 180);
    });
  };
  scroller.addEventListener('scroll', onScroll, { passive: true });
  const ro = new ResizeObserver(layout);
  ro.observe(track);
  ro.observe(pin);

  root.querySelector('.jr-prev')!.addEventListener('click', () => go(active - 1));
  root.querySelector('.jr-next')!.addEventListener('click', () => go(active + 1));
  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  // Cards are links to their page; tabbing onto one travels the timeline to it
  items.forEach((li, k) => li.addEventListener('focusin', () => go(k)));

  track.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target === track) return void items[active]?.querySelector<HTMLAnchorElement>('.jr-card')?.click();
    const to = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: items.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  });
}
