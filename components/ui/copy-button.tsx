'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircleIcon } from '@/components/icons';

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  className,
  size = 'sm',
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for non-https or older browsers
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium ring-1 ring-inset transition',
        copied
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50',
        sizeClass,
        className
      )}
    >
      {copied && <CheckCircleIcon size={14} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
