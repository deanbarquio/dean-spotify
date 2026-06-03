/** Scroll a section into view inside #main-scroll (not the window). */

const SCROLL_OFFSET = 56;

export function scrollToSection(
  selector: string,
  behavior: ScrollBehavior = 'smooth'
): boolean {
  const id = selector.startsWith('#') ? selector : `#${selector}`;
  const target = document.querySelector(id) as HTMLElement | null;
  const scroller = document.getElementById('main-scroll');
  if (!target || !scroller) return false;

  const top =
    target.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    SCROLL_OFFSET;

  scroller.scrollTo({ top: Math.max(0, top), behavior });
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
