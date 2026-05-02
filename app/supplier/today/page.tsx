import { createClient } from '@/lib/supabase/server';
import { requireSupplier } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Alert } from '@/components/ui/alert';
import { Card, CardBody } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { SupplierTodayList, type SupplierReviewRow, type MyReviewer } from './today-list';
import type { ReviewStatus } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SupplierTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await requireSupplier();
  const supabase = await createClient();

  // RLS already filters reviews to this supplier's main_supplier_id
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, review_code, status, scheduled_date, dispatched_date, client_id')
    .in('status', ['assigned_to_supplier', 'dispatched'])
    .order('dispatched_date', { ascending: true, nullsFirst: false })
    .order('scheduled_date', { ascending: true });

  // Client info for the rows
  const clientIds = Array.from(new Set((reviews || []).map((r) => r.client_id).filter(Boolean) as string[]));
  const { data: clients } = clientIds.length
    ? await supabase.from('clients').select('id, name, platform, review_url').in('id', clientIds)
    : { data: [] };
  const clientMap = new Map((clients || []).map((c) => [c.id, c]));

  // Reviewer pool (RLS-scoped to this supplier)
  const { data: reviewerRows } = await supabase
    .from('reviewers')
    .select('id, name, identifier, lifetime_capacity, status')
    .eq('status', 'active')
    .order('name');
  const { data: capRows } = await supabase
    .from('reviewer_cap_status')
    .select('id, posted_count, is_at_cap');
  const capMap = new Map(
    (capRows || []).map((c) => [c.id, { posted_count: Number(c.posted_count) || 0, is_at_cap: Boolean(c.is_at_cap) }])
  );

  const rows: SupplierReviewRow[] = (reviews || []).map((r) => {
    const c = clientMap.get(r.client_id);
    return {
      id: r.id,
      review_code: r.review_code || '',
      status: r.status as ReviewStatus,
      scheduled_date: r.scheduled_date,
      dispatched_date: r.dispatched_date,
      client_name: c?.name || '—',
      client_platform: c?.platform || '',
      review_url: c?.review_url || null,
    };
  });

  const reviewers: MyReviewer[] = (reviewerRows || []).map((r) => {
    const cap = capMap.get(r.id) || { posted_count: 0, is_at_cap: false };
    return {
      id: r.id,
      name: r.name,
      identifier: r.identifier,
      posted_count: cap.posted_count,
      lifetime_capacity: r.lifetime_capacity,
      is_at_cap: cap.is_at_cap,
    };
  });

  // Parse eligibility error: format "eligibility:<code>" — but we don't know which row triggered it
  // unless we encode that. Simpler: show as a top-level alert; user re-opens the row they were on.
  const eligibilityWarning =
    params.error && params.error.startsWith('eligibility:') ? params.error.split(':')[1] : null;
  const otherError =
    params.error && !params.error.startsWith('eligibility:') ? params.error : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi${user.full_name ? ', ' + user.full_name.split(' ')[0] : ''} — your queue`}
        description="Reviews assigned to you. Open a row to record the reviewer name and posted URL."
      />

      {params.ok && <Alert tone="success">{params.ok}</Alert>}
      {otherError && <Alert tone="error">{otherError}</Alert>}

      {error && <Alert tone="error">{error.message}</Alert>}

      {reviewers.length === 0 ? (
        <Card>
          <CardBody className="space-y-3 text-center">
            <div className="text-sm text-slate-700">
              You don&rsquo;t have any reviewers in your pool yet. Add some first so you can record completions.
            </div>
            <div>
              <ButtonLink href="/supplier/reviewers?form=open">Add your first reviewer</ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <SupplierTodayList
          rows={rows}
          reviewers={reviewers}
          eligibilityFor={null}
          eligibilityWarning={eligibilityWarning}
        />
      )}
    </div>
  );
}
