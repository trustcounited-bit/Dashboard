import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardCheckIcon } from '@/components/icons';
import { CompletionEntry, type PendingReview, type ReviewerOption } from './completion-entry';
import type { ReviewStatus } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CompletionsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Pending reviews = assigned or dispatched but not yet posted
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, review_code, status, client_id, main_supplier_id, scheduled_date, dispatched_date')
    .in('status', ['assigned_to_supplier', 'dispatched'])
    .order('dispatched_date', { ascending: true, nullsFirst: false })
    .order('scheduled_date', { ascending: true });

  // All clients for name lookup
  const clientIds = Array.from(new Set((reviews || []).map((r) => r.client_id).filter(Boolean) as string[]));
  const { data: clients } = clientIds.length
    ? await supabase.from('clients').select('id, name, platform').in('id', clientIds)
    : { data: [] };
  const clientMap = new Map((clients || []).map((c) => [c.id, c]));

  // All suppliers for name lookup
  const supplierIds = Array.from(new Set((reviews || []).map((r) => r.main_supplier_id).filter(Boolean) as string[]));
  const { data: suppliers } = supplierIds.length
    ? await supabase.from('main_suppliers').select('id, name').in('id', supplierIds)
    : { data: [] };
  const supplierMap = new Map((suppliers || []).map((s) => [s.id, s.name]));

  // All reviewers + cap status
  const { data: reviewerRows } = await supabase
    .from('reviewers')
    .select('id, name, identifier, main_supplier_id, lifetime_capacity, status')
    .eq('status', 'active');

  const { data: capRows } = await supabase
    .from('reviewer_cap_status')
    .select('id, posted_count, is_at_cap');
  const capMap = new Map(
    (capRows || []).map((c) => [c.id, { posted_count: Number(c.posted_count) || 0, is_at_cap: Boolean(c.is_at_cap) }])
  );

  const pendingReviews: PendingReview[] = (reviews || []).map((r) => {
    const c = clientMap.get(r.client_id);
    return {
      id: r.id,
      review_code: r.review_code || '',
      status: r.status as ReviewStatus,
      client_id: r.client_id,
      client_name: c?.name || '—',
      client_platform: c?.platform || '',
      main_supplier_id: r.main_supplier_id,
      main_supplier_name: r.main_supplier_id ? supplierMap.get(r.main_supplier_id) || null : null,
      scheduled_date: r.scheduled_date,
      dispatched_date: r.dispatched_date,
    };
  });

  const reviewerOptions: ReviewerOption[] = (reviewerRows || []).map((r) => {
    const cap = capMap.get(r.id) || { posted_count: 0, is_at_cap: false };
    return {
      id: r.id,
      name: r.name,
      identifier: r.identifier,
      main_supplier_id: r.main_supplier_id,
      lifetime_capacity: r.lifetime_capacity,
      posted_count: cap.posted_count,
      is_at_cap: cap.is_at_cap,
    };
  });

  // Parse eligibility warning from URL: error="eligibility:<code>"
  const eligibilityWarning =
    params.error && params.error.startsWith('eligibility:')
      ? params.error.split(':')[1]
      : undefined;

  // Other errors get a normal alert
  const otherError =
    params.error && !params.error.startsWith('eligibility:') ? params.error : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record completions"
        description="Enter what each supplier reported back: pick the review code, choose the reviewer, and paste the live URL. Eligibility rules are checked automatically."
      />

      {params.ok && <Alert tone="success">{params.ok}</Alert>}
      {otherError && <Alert tone="error">{otherError}</Alert>}

      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : pendingReviews.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheckIcon size={22} />}
          title="No completions to record"
          description="Once you assign or dispatch reviews on the Today page, they'll show up here for entry."
        />
      ) : (
        <CompletionEntry
          reviews={pendingReviews}
          reviewers={reviewerOptions}
          eligibilityWarning={eligibilityWarning}
        />
      )}
    </div>
  );
}
