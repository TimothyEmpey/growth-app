import { useEffect, useRef, type ReactNode } from 'react';

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
        {children}
      </div>
    </div>
  );
}
