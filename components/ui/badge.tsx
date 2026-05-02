import { cn, REVIEW_STATUS_COLORS, REVIEW_STATUS_LABELS, type ReviewStatus } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        REVIEW_STATUS_COLORS[status],
        className
      )}
    >
      {REVIEW_STATUS_LABELS[status]}
    </span>
  );
}

export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet';
  className?: string;
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    rose: 'bg-rose-50 text-rose-800 ring-rose-200',
    blue: 'bg-blue-50 text-blue-800 ring-blue-200',
    violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
