import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { AlertTriangleIcon, CheckCircleIcon } from '@/components/icons';
import { formatDate, formatRelative } from '@/lib/utils';
import { markLiveAction, markDroppedAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function DropsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const twentyDaysAgo = new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // 1. Reviews currently dropped (awaiting re-post — replacement should be auto-queued)
  const { data: dropped } = await supabase
    .from('reviews')
    .select('id, review_code, posted_url, posted_date, last_checked_date, client_id, main_supplier_id, status')
    .eq('status', 'dropped')
    .order('last_checked_date', { ascending: false });

  // 2. Reviews due for 20-day check: status=posted AND posted_date <= 20 days ago
  // AND (last_checked_date is null OR last_checked_date <= 20 days ago)
  const { data: dueCheck } = await supabase
    .from('reviews')
    .select('id, review_code, posted_url, posted_date, last_checked_date, client_id, main_supplier_id, status')
    .eq('status', 'posted')
    .lte('posted_date', twentyDaysAgo)
    .or(`last_checked_date.is.null,last_checked_date.lte.${twentyDaysAgo}`)
    .order('posted_date', { ascending: true })
    .limit(100);

  // 3. Anything explicitly flagged due_for_check by a job
  const { data: flagged } = await supabase
    .from('reviews')
    .select('id, review_code, posted_url, posted_date, last_checked_date, client_id, main_supplier_id, status')
    .eq('status', 'due_for_check')
    .order('posted_date', { ascending: true });

  // Merge dueCheck + flagged, dedupe by id
  const checkQueueIds = new Set<string>();
  const checkQueue: typeof dueCheck = [];
  [...(flagged || []), ...(dueCheck || [])].forEach((r) => {
    if (r && !checkQueueIds.has(r.id)) {
      checkQueueIds.add(r.id);
      checkQueue.push(r);
    }
  });

  // Lookup tables
  const allIds = [
    ...(dropped || []).map((r) => r.client_id),
    ...checkQueue.map((r) => r.client_id),
  ].filter(Boolean) as string[];
  const { data: clients } = allIds.length
    ? await supabase.from('clients').select('id, name, platform').in('id', Array.from(new Set(allIds)))
    : { data: [] };
  const clientMap = new Map((clients || []).map((c) => [c.id, c]));

  const supplierIds = [
    ...(dropped || []).map((r) => r.main_supplier_id),
    ...checkQueue.map((r) => r.main_supplier_id),
  ].filter(Boolean) as string[];
  const { data: suppliers } = supplierIds.length
    ? await supabase.from('main_suppliers').select('id, name').in('id', Array.from(new Set(supplierIds)))
    : { data: [] };
  const supplierMap = new Map((suppliers || []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drops & 20-day checks"
        description="Reviews that fell off the platform — and reviews that are due for verification."
      />

      {params.ok && <Alert tone="success">{params.ok}</Alert>}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      {/* 20-day check queue */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              Due for 20-day check
              <Badge tone={checkQueue.length > 0 ? 'violet' : 'slate'}>
                {checkQueue.length}
              </Badge>
            </span>
          </CardTitle>
        </CardHeader>
        {checkQueue.length === 0 ? (
          <CardBody>
            <div className="py-4 text-center text-sm text-slate-500">
              No reviews are due for verification right now.
            </div>
          </CardBody>
        ) : (
          <div className="divide-y divide-slate-100">
            {checkQueue.map((r) => {
              const c = clientMap.get(r.client_id);
              const s = r.main_supplier_id ? supplierMap.get(r.main_supplier_id) : null;
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-900">{r.review_code}</span>
                        <Badge tone="slate">{c?.name || '—'}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Posted {formatRelative(r.posted_date)} ({formatDate(r.posted_date)})
                        {s && <> · Supplier: {s}</>}
                        {r.last_checked_date && <> · Last checked: {formatDate(r.last_checked_date)}</>}
                      </div>
                      {r.posted_url && (
                        <a
                          href={r.posted_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block truncate text-xs text-slate-700 underline-offset-2 hover:underline"
                        >
                          {r.posted_url} ↗
                        </a>
                      )}
                    </div>
                    <CheckActions reviewId={r.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Dropped queue */}
      <Card className={(dropped || []).length > 0 ? 'border-rose-200' : ''}>
        <CardHeader className={(dropped || []).length > 0 ? 'border-rose-100 bg-rose-50/30' : ''}>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              Dropped — replacements queued
              <Badge tone={(dropped || []).length > 0 ? 'rose' : 'slate'}>
                {(dropped || []).length}
              </Badge>
            </span>
          </CardTitle>
        </CardHeader>
        {(!dropped || dropped.length === 0) ? (
          <CardBody>
            <div className="py-4 text-center text-sm text-slate-500">
              Nothing dropped. Good work.
            </div>
          </CardBody>
        ) : (
          <div className="divide-y divide-slate-100">
            {dropped.map((r) => {
              const c = clientMap.get(r.client_id);
              const s = r.main_supplier_id ? supplierMap.get(r.main_supplier_id) : null;
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-900">{r.review_code}</span>
                        <Badge tone="rose">Dropped</Badge>
                        <Badge tone="slate">{c?.name || '—'}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Was posted {formatDate(r.posted_date)}
                        {s && <> · By: {s}</>}
                        {r.last_checked_date && <> · Detected: {formatDate(r.last_checked_date)}</>}
                      </div>
                      <div className="mt-1 text-xs text-emerald-700">
                        ✓ A replacement task was created automatically — see Today / Orders.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Alert tone="info">
        <strong>How this works:</strong> When a review is older than 20 days and hasn&rsquo;t been verified recently, it shows up here.
        Click the link to verify it&rsquo;s still live. If it is, click <strong>Mark live</strong>. If it&rsquo;s been removed, click <strong>Mark dropped</strong> — a replacement task will be queued automatically.
      </Alert>
    </div>
  );
}

function CheckActions({ reviewId }: { reviewId: string }) {
  return (
    <div className="flex items-end gap-2">
      <form action={markLiveAction} className="flex items-end gap-2">
        <input type="hidden" name="review_id" value={reviewId} />
        <Input name="notes" placeholder="Optional notes" className="w-40" />
        <Button type="submit" variant="outline" size="sm">
          <CheckCircleIcon size={14} /> Mark live
        </Button>
      </form>
      <form action={markDroppedAction}>
        <input type="hidden" name="review_id" value={reviewId} />
        <Button type="submit" variant="danger" size="sm">
          <AlertTriangleIcon size={14} /> Mark dropped
        </Button>
      </form>
    </div>
  );
}
