/**
 * Tiny class-name helper. Filters falsy values and joins.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Map raw DB status values to friendly labels for UI display.
 * Per Raghav's spec: "Live" not "posted", "Waiting" not "queued", etc.
 */
export const REVIEW_STATUS_LABELS = {
  unassigned: 'Waiting',
  assigned_to_supplier: 'Assigned',
  dispatched: 'Sent today',
  posted: 'Live',
  due_for_check: 'Check due',
  dropped: 'Dropped',
  replaced: 'Replaced',
} as const;

export type ReviewStatus = keyof typeof REVIEW_STATUS_LABELS;

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  unassigned: 'bg-slate-100 text-slate-700 ring-slate-200',
  assigned_to_supplier: 'bg-amber-50 text-amber-800 ring-amber-200',
  dispatched: 'bg-blue-50 text-blue-800 ring-blue-200',
  posted: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  due_for_check: 'bg-violet-50 text-violet-800 ring-violet-200',
  dropped: 'bg-rose-50 text-rose-800 ring-rose-200',
  replaced: 'bg-slate-100 text-slate-500 ring-slate-200 line-through',
};

export const ELIGIBILITY_LABELS: Record<string, string> = {
  ok: 'Eligible',
  reviewer_not_found: 'Reviewer not found',
  lifetime_cap_reached: 'Reviewer has hit lifetime cap',
  already_did_this_business: 'Reviewer has already reviewed this business',
  too_soon_after_last_review: 'Last review was less than 2 days ago',
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays === -1) return 'tomorrow';
  if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 0 && diffDays > -7) return `in ${Math.abs(diffDays)} days`;
  return formatDate(iso);
}
