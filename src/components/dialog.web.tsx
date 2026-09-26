import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';

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
  const drag = useRef<{ y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
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
  const startDrag = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    drag.current = { y: touch.clientY, time: performance.now() };
    setDragging(true);
    setDragOffset(0);
  };
  const moveDrag = (event: TouchEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    setDragOffset(Math.max(0, touch.clientY - drag.current.y));
  };
  const endDrag = (event: TouchEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const touch = event.changedTouches[0];
    const distance = touch ? Math.max(0, touch.clientY - drag.current.y) : dragOffset;
    const elapsed = Math.max(1, performance.now() - drag.current.time);
    drag.current = null;
    setDragging(false);
    if (distance >= DISMISS_DISTANCE || distance / elapsed >= DISMISS_VELOCITY) {
      setDragOffset(window.innerHeight);
      window.setTimeout(() => dismiss.current(), 180);
      return;
    }
    setDragOffset(0);
  };
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
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: dragging ? 'none' : undefined,
        }}
      >
        <div
          className="growth-dialog-drag-handle"
          aria-hidden="true"
          onTouchStart={startDrag}
          onTouchMove={moveDrag}
          onTouchEnd={endDrag}
          onTouchCancel={() => {
            drag.current = null;
            setDragging(false);
            setDragOffset(0);
          }}
        >
          <span />
        </div>
        {children}
      </div>
    </div>
  );
}
