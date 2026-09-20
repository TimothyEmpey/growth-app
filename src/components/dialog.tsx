import type { ReactNode } from 'react';

export function Dialog({
  children,
}: {
  children: ReactNode;
  title: string;
  onDismiss: () => void;
}) {
  return children;
}
