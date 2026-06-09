'use client';

import type { ReactNode } from 'react';

type Props = {
  message: string;
  children: ReactNode;
  className?: string;
  title?: string;
};

/**
 * Submit button that shows a browser confirm() dialog before submitting.
 * Use inside a <form action={serverAction}> to gate destructive actions.
 */
export function ConfirmButton({ message, children, className, title }: Props) {
  return (
    <button
      type="submit"
      className={className}
      title={title}
      onClick={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
