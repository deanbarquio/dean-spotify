/** Spotify-style sidebar: mobile drawer + desktop collapse */

/** Matches app-shell desktop breakpoint (min-width: 861px) */
const MOBILE_BP = 860;
/** Below this (on desktop) the sidebar defaults to the icon rail unless the user expanded it */
const RAIL_BP = 1100;
const STORAGE_KEY = 'sb-collapsed';

export function isMobileSidebar(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches;
}

function readPref(): '1' | '0' | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === '1' || v === '0' ? v : null;
  } catch {
    return null;
  }
}

function writePref(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Collapsed state for the current viewport: saved choice, else auto rail on narrow desktops. */
export function wantsCollapsed(): boolean {
  const pref = readPref();
  if (pref) return pref === '1';
  return window.matchMedia(`(max-width: ${RAIL_BP - 1}px)`).matches;
}

/** Let layout-dependent code (ScrollTrigger, Three.js canvases) re-measure after the main column resizes. */
function notifyLayoutChange(): void {
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

/** Skip the drawer slide when the layout jumps across breakpoints. */
function suppressTransitions(): void {
  const root = document.documentElement;
  root.classList.add('sb-no-anim');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('sb-no-anim')));
}

export function initSidebarNav(): () => void {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sb-overlay');
  const layout = document.querySelector('.app-layout');
  const toggles = document.querySelectorAll<HTMLElement>('[data-sb-toggle]');
  const collapseBtn = document.getElementById('sb-collapse-btn');
  const mainScroll = document.getElementById('main-scroll');

  if (!sidebar || !layout) return () => {};

  let lastToggle: HTMLElement | null = null;

  const applyCollapsed = (collapsed: boolean) => {
    const changed = sidebar.classList.contains('sb-collapsed') !== collapsed;
    sidebar.classList.toggle('sb-collapsed', collapsed);
    layout.classList.toggle('app-layout--collapsed', collapsed);
    collapseBtn?.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    collapseBtn?.setAttribute('aria-label', label);
    collapseBtn?.setAttribute('title', label);
    if (changed) notifyLayoutChange();
  };

  const isOpen = () => sidebar.classList.contains('sb-open');

  const openDrawer = () => {
    sidebar.classList.add('sb-open');
    sidebar.removeAttribute('inert');
    overlay?.classList.add('visible');
    document.body.classList.add('sidebar-open');
    toggles.forEach((el) => {
      el.classList.add('open');
      el.setAttribute('aria-expanded', 'true');
    });
    mainScroll?.classList.add('main-scroll--locked');
    // Focus after the slide starts so the browser doesn't jump-scroll the off-screen panel
    requestAnimationFrame(() => sidebar.querySelector<HTMLElement>('.sb-nav-link')?.focus({ preventScroll: true }));
  };

  const closeDrawer = ({ restoreFocus = false } = {}) => {
    const wasOpen = isOpen();
    sidebar.classList.remove('sb-open');
    overlay?.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
    toggles.forEach((el) => {
      el.classList.remove('open');
      el.setAttribute('aria-expanded', 'false');
    });
    mainScroll?.classList.remove('main-scroll--locked');
    if (isMobileSidebar()) sidebar.setAttribute('inert', '');
    if (wasOpen && restoreFocus) lastToggle?.focus({ preventScroll: true });
  };

  const onToggleClick = (e: Event) => {
    lastToggle = e.currentTarget as HTMLElement;
    if (isMobileSidebar()) {
      if (isOpen()) closeDrawer({ restoreFocus: true });
      else openDrawer();
      return;
    }
    const next = !sidebar.classList.contains('sb-collapsed');
    writePref(next);
    applyCollapsed(next);
  };

  toggles.forEach((el) => el.addEventListener('click', onToggleClick));

  const onOverlayClick = () => closeDrawer({ restoreFocus: true });
  overlay?.addEventListener('click', onOverlayClick);

  // Navigating from the drawer closes it (search keeps it open so the input stays usable)
  const onSidebarClick = (e: Event) => {
    if (!isMobileSidebar()) return;
    const link = (e.target as HTMLElement).closest('a[href^="#"]');
    if (link && sidebar.contains(link)) closeDrawer();
  };
  sidebar.addEventListener('click', onSidebarClick);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen()) closeDrawer({ restoreFocus: true });
  };
  document.addEventListener('keydown', onKey);

  // Swipe left to close the drawer
  let touchX = 0;
  let touchY = 0;
  const onTouchStart = (e: TouchEvent) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!isOpen()) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) closeDrawer();
  };
  sidebar.addEventListener('touchstart', onTouchStart, { passive: true });
  sidebar.addEventListener('touchend', onTouchEnd, { passive: true });

  const syncToViewport = () => {
    if (isMobileSidebar()) {
      applyCollapsed(false);
      if (!isOpen()) sidebar.setAttribute('inert', '');
    } else {
      closeDrawer();
      sidebar.removeAttribute('inert');
      applyCollapsed(wantsCollapsed());
    }
  };

  const mobileMq = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
  const railMq = window.matchMedia(`(max-width: ${RAIL_BP - 1}px)`);
  const onMq = () => {
    suppressTransitions();
    syncToViewport();
  };
  mobileMq.addEventListener('change', onMq);
  railMq.addEventListener('change', onMq);

  syncToViewport();

  return () => {
    toggles.forEach((el) => el.removeEventListener('click', onToggleClick));
    overlay?.removeEventListener('click', onOverlayClick);
    sidebar.removeEventListener('click', onSidebarClick);
    sidebar.removeEventListener('touchstart', onTouchStart);
    sidebar.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('keydown', onKey);
    mobileMq.removeEventListener('change', onMq);
    railMq.removeEventListener('change', onMq);
    closeDrawer();
  };
}

/** Expand the desktop rail (e.g. before focusing the library search). No-op on mobile. */
export function expandSidebar(): void {
  if (isMobileSidebar()) return;
  const sidebar = document.getElementById('sidebar');
  if (!sidebar?.classList.contains('sb-collapsed')) return;
  document.getElementById('sb-collapse-btn')?.click();
}
