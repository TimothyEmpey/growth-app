import { useEffect, useRef, type ReactNode } from 'react';
import { canScroll, reducedMotion, TOUCH_CONTROLS } from './touch.web';

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.55;

// Web sheet shell: backdrop dismissal, Escape handling, and keyboard focus containment.
// Native sheets are presented by the router; dialog.tsx simply passes through their content.
export function Dialog({
  children,
  title,
  onDismiss,
}: {
  children: ReactNode;
  title: string;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    const element = dialog.current!;
    const overlay = element.parentElement!;
    let start: { x: number; y: number; time: number; target: Element; dragging: boolean } | null =
      null;
    let offset = 0;
    let closing = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const reset = () => {
      start = null;
      offset = 0;
      element.style.transition = '';
      element.style.transform = '';
    };
    const begin = (event: TouchEvent) => {
      if (closing || event.touches.length !== 1) return;
      const target = event.target as Element;
      const point = event.touches[0];
      start = {
        x: point.clientX,
        y: point.clientY,
        time: performance.now(),
        target,
        dragging: false,
      };
    };
    const move = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) return;
      const point = event.touches[0];
      const dy = point.clientY - start.y;
      const dx = point.clientX - start.x;
      // Let sheet content scroll first. At its top, a downward pull owns the sheet.
      if (!start.dragging && canScroll(start.target, element, dy)) {
        start.y = point.clientY;
        start.x = point.clientX;
        start.time = performance.now();
        return;
      }
      if (
        !start.dragging &&
        (start.target.closest(TOUCH_CONTROLS) || Math.abs(dx) > Math.abs(dy))
      ) {
        if (!canScroll(start.target, element, dy) && event.cancelable) event.preventDefault();
        return;
      }
      if (dy > 8 || start.dragging) {
        if (event.cancelable) event.preventDefault();
        start.dragging = true;
        offset = Math.max(0, dy);
        element.style.transition = 'none';
        element.style.transform = `translate3d(0,${offset}px,0)`;
      } else if (!canScroll(start.target, element, dy) && event.cancelable) event.preventDefault();
    };
    const end = () => {
      if (
        start?.dragging &&
        (offset > DISMISS_DISTANCE ||
          (offset > 35 && offset / Math.max(1, performance.now() - start.time) > DISMISS_VELOCITY))
      ) {
        closing = true;
        start = null;
        element.style.transition = '';
        element.style.transform = `translate3d(0,${window.innerHeight}px,0)`;
        timer = setTimeout(() => dismiss.current(), reducedMotion() ? 0 : 180);
      } else reset();
    };
    const blockBackground = (event: TouchEvent) => {
      if (!element.contains(event.target as Node) && event.cancelable) event.preventDefault();
    };
    const blockWheel = (event: WheelEvent) => {
      if (!canScroll(event.target as Element, element, -event.deltaY)) event.preventDefault();
    };
    overlay.addEventListener('touchstart', begin, { passive: true });
    overlay.addEventListener('touchmove', move, { passive: false });
    overlay.addEventListener('touchend', end);
    overlay.addEventListener('touchcancel', reset);
    document.addEventListener('touchmove', blockBackground, { passive: false });
    overlay.addEventListener('wheel', blockWheel, { passive: false });
    return () => {
      if (timer) clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      overlay.removeEventListener('touchstart', begin);
      overlay.removeEventListener('touchmove', move);
      overlay.removeEventListener('touchend', end);
      overlay.removeEventListener('touchcancel', reset);
      document.removeEventListener('touchmove', blockBackground);
      overlay.removeEventListener('wheel', blockWheel);
    };
  }, []);
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () =>
      [
        ...element.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])',
        ),
      ].filter((node) => node.getClientRects().length > 0);
    if (!element.contains(document.activeElement)) (focusable()[0] ?? element).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss.current();
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable(),
        first = nodes[0],
        last = nodes.at(-1);
      if (!first) {
        event.preventDefault();
        element.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === element)
      ) {
        event.preventDefault();
        last!.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!element.contains(event.target as Node)) (focusable()[0] ?? element).focus();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
      if (previous && !element.contains(previous)) requestAnimationFrame(() => previous.focus());
    };
  }, []);
  return (
    <div
      className="growth-dialog-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div
        ref={dialog}
        className="growth-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="growth-dialog-drag-handle" aria-hidden="true">
          <span />
        </div>
        {children}
      </div>
    </div>
  );
}
