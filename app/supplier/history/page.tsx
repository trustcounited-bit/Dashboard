import { createClient } from '@/lib/supabase/server';
import { requireSupplier } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { HistoryIcon } from '@/components/icons';
import { formatDate, formatRelative, type ReviewStatus } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SupplierHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  await requireSupplier();
  const supabase = await createClient();

  let query = supabase
    .from('reviews')
    .select('id, review_code, status, posted_date, posted_url, last_checked_date, client_id, reviewer_id')
    .order('posted_date', { ascending: false, nullsFirst: false })
    .limit(200);

  if (params.filter === 'live') {
    query = query.eq('status', 'posted');
  } else if (params.filter === 'dropped') {
    query = query.eq('status', 'dropped');
  } else if (params.filter === 'replaced') {
    query = query.eq('status', 'replaced');
  } else {
    // 'all' → show everything that has reached at least 'posted' status
    query = query.in('status', ['posted', 'due_for_check', 'dropped', 'replaced']);
  }

  const { data: reviews, error } = await query;

  // Lookups
  const clientIds = Array.from(new Set((reviews || []).map((r) => r.client_id).filter(Boolean) as string[]));
  const reviewerIds = Array.from(new Set((reviews || []).map((r) => r.reviewer_id).filter(Boolean) as string[]));

  const [{ data: clients }, { data: reviewers }] = await Promise.all([
    clientIds.length
      ? supabase.from('clients').select('id, name, platform').in('id', clientIds)
      : Promise.resolve({ data: [] }),
    reviewerIds.length
      ? supabase.from('reviewers').select('id, name, identifier').in('id', reviewerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientMap = new Map((clients || []).map((c) => [c.id, c]));
  const reviewerMap = new Map((reviewers || []).map((r) => [r.id, r]));

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'live', label: 'Live' },
    { key: 'dropped', label: 'Dropped' },
    { key: 'replaced', label: 'Replaced' },
  ];
  const activeFilter = params.filter || 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        description="Reviews you've completed. Track which are still live and which were dropped."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Filter</span>
          {tabs.map((t) => (
            <a
              key={t.key}
              href={t.key === 'all' ? '/supplier/history' : `/supplier/history?filter=${t.key}`}
              className={
                'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
                (activeFilter === t.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50')
              }
            >
              {t.label}
            </a>
          ))}
        </div>
      </Card>

      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : !reviews || reviews.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={22} />}
          title="No history yet"
          description="Once you complete reviews, they'll show up here."
        />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            <div className="hidden grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-2">Code</div>
              <div className="col-span-3">Client</div>
              <div className="col-span-3">Reviewer</div>
              <div className="col-span-2">Posted</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            {reviews.map((r) => {
              const c = clientMap.get(r.client_id);
              const rev = r.reviewer_id ? reviewerMap.get(r.reviewer_id) : null;
              return (
                <div key={r.id} className="grid grid-cols-1 gap-2 px-5 py-3 text-sm sm:grid-cols-12 sm:items-center sm:gap-4">
                  <div className="font-mono text-xs sm:col-span-2">
                    {r.posted_url ? (
                      <a href={r.posted_url} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:underline">
                        {r.review_code}
                      </a>
                    ) : (
                      <span className="text-slate-700">{r.review_code}</span>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <div className="font-medium text-slate-900">{c?.name || '—'}</div>
                    <div className="text-xs text-slate-500">{c?.platform || ''}</div>
                  </div>
                  <div className="sm:col-span-3">
                    {rev ? (
                      <>
                        <div className="text-slate-700">{rev.name}</div>
                        {rev.identifier && <div className="text-xs text-slate-500">{rev.identifier}</div>}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 sm:col-span-2">
                    {r.posted_date ? (
                      <>
                        <div>{formatDate(r.posted_date)}</div>
                        <div className="text-slate-500">{formatRelative(r.posted_date)}</div>
                      </>
                    ) : '—'}
                    {r.last_checked_date && (
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Checked: {formatDate(r.last_checked_date)}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2 sm:text-right">
                    <StatusBadge status={r.status as ReviewStatus} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-500">
        Showing the latest 200 records. Older history is preserved in the database.
      </p>
    </div>
  );
}
