/** Scroll a section into view inside #main-scroll (not the window). */

import { getMainScroller, getMainScrollMetrics, scrollMainTo } from './smooth-scroll';

const SCROLL_OFFSET = 56;

export function scrollToSection(
  selector: string,
  behavior: ScrollBehavior = 'smooth'
): boolean {
  const id = selector.startsWith('#') ? selector : `#${selector}`;
  const target = document.querySelector(id) as HTMLElement | null;
  const scroller = getMainScroller();
  if (!target || !scroller) return false;

  const { scrollTop } = getMainScrollMetrics();
  const top =
    target.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scrollTop -
    SCROLL_OFFSET;

  scrollMainTo(Math.max(0, top), {
    immediate: behavior === 'auto',
    duration: behavior === 'smooth' ? 0.85 : undefined,
  });
  return true;
}

export function bindHashNavigation(): void {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = (anchor as HTMLAnchorElement).getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      scrollToSection(href, 'smooth');

      if (typeof history !== 'undefined' && history.pushState) {
        history.pushState(null, '', href);
      }
    });
  });
}
