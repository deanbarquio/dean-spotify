/** Spotify-style sidebar: mobile drawer + desktop collapse */

/** Matches app-shell desktop breakpoint (min-width: 861px) */
const MOBILE_BP = 860;

export function isMobileSidebar(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches;
}

export function initSidebarNav(): () => void {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sb-overlay');
  const layout = document.querySelector('.app-layout');
  const toggles = document.querySelectorAll<HTMLElement>('[data-sb-toggle]');
  const collapseBtn = document.getElementById('sb-collapse-btn');

  if (!sidebar || !layout) return () => {};

  const setCollapsed = (collapsed: boolean) => {
    sidebar.classList.toggle('sb-collapsed', collapsed);
    layout.classList.toggle('app-layout--collapsed', collapsed);
    collapseBtn?.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    try {
      localStorage.setItem('sb-collapsed', collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const openDrawer = () => {
    sidebar.classList.add('sb-open');
    overlay?.classList.add('visible');
    document.body.classList.add('sidebar-open');
    toggles.forEach((el) => {
      el.classList.add('open');
      el.setAttribute('aria-expanded', 'true');
    });
    const main = document.getElementById('main-scroll');
    if (main) main.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    sidebar.classList.remove('sb-open');
    overlay?.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
    toggles.forEach((el) => {
      el.classList.remove('open');
      el.setAttribute('aria-expanded', 'false');
    });
    const main = document.getElementById('main-scroll');
    if (main) main.style.overflow = '';
  };

  const toggleDrawer = () => {
    if (sidebar.classList.contains('sb-open')) closeDrawer();
    else openDrawer();
  };

  const onToggleClick = () => {
    if (isMobileSidebar()) toggleDrawer();
    else setCollapsed(!sidebar.classList.contains('sb-collapsed'));
  };

  toggles.forEach((el) => {
    el.addEventListener('click', onToggleClick);
  });

  overlay?.addEventListener('click', closeDrawer);

  document.querySelectorAll('.sb-nav-link, .sb-lib-item, #sb-home-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (isMobileSidebar()) closeDrawer();
    });
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && sidebar.classList.contains('sb-open')) closeDrawer();
  };
  document.addEventListener('keydown', onKey);

  const mq = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
  const onMq = () => {
    if (mq.matches) {
      sidebar.classList.remove('sb-collapsed');
      layout.classList.remove('app-layout--collapsed');
    } else {
      closeDrawer();
      try {
        if (localStorage.getItem('sb-collapsed') === '1') setCollapsed(true);
      } catch {
        /* ignore */
      }
    }
  };
  mq.addEventListener('change', onMq);

  if (!mq.matches) {
    try {
      if (localStorage.getItem('sb-collapsed') === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }

  return () => {
    toggles.forEach((el) => el.removeEventListener('click', onToggleClick));
    overlay?.removeEventListener('click', closeDrawer);
    document.removeEventListener('keydown', onKey);
    mq.removeEventListener('change', onMq);
    closeDrawer();
  };
}
