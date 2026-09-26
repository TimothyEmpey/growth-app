export const TOUCH_CONTROLS =
  'input,textarea,select,button,a,[role="button"],[role="slider"],[contenteditable="true"],[data-testid="weight-chart"]';

export function canScroll(target: Element, boundary: HTMLElement, delta: number) {
  for (
    let node: Element | null = target;
    node && boundary.contains(node);
    node = node.parentElement
  ) {
    if (!(node instanceof HTMLElement)) continue;
    if (!/(auto|scroll)/.test(getComputedStyle(node).overflowY)) continue;
    if (delta > 0 && node.scrollTop > 1) return true;
    if (delta < 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1) return true;
  }
  return false;
}

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
