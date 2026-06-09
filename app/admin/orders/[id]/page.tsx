import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { PencilIcon, TrashIcon } from '@/components/icons';
import { formatDate } from '@/lib/utils';
import type { ReviewStatus } from '@/lib/utils';
import { updateOrderStatusAction, deleteOrderAction } from '../actions';
import { EditOrderForm } from './edit-order-form';
import { ReviewTextEditor } from './review-text-editor';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; mode?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const editMode = sp.mode === 'edit';
  const supabase = await createClient();

  const [orderRes, progressRes, reviewsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_code, client_id, quantity, cadence_days, order_date, start_date, customer_name, customer_email, status, notes, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('order_progress').select('*').eq('order_id', id).maybeSingle(),
    supabase
      .from('reviews')
      .select('id, review_code, sequence_number, scheduled_date, dispatched_date, posted_date, posted_url, status, main_supplier_id, reviewer_identifier, review_text, review_text_edited_by_supplier')
      .eq('order_id', id)
      .order('sequence_number', { ascending: true }),
  ]);

  if (!orderRes.data) notFound();
  const order = orderRes.data;
  const progress = progressRes.data;
  const reviews = reviewsRes.data || [];

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, platform, location, review_url')
    .eq('id', order.client_id)
    .maybeSingle();

  const supplierIds = Array.from(new Set(reviews.map((r) => r.main_supplier_id).filter(Boolean) as string[]));
  const supplierMap = new Map<string, string>();
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase.from('main_suppliers').select('id, name').in('id', supplierIds);
    (suppliers || []).forEach((s) => supplierMap.set(s.id, s.name));
  }

  const live = Number(progress?.reviews_live || 0);
  const total = order.quantity;
  const pct = total > 0 ? Math.round((live / total) * 100) : 0;
  const reviewsWithText = reviews.filter((r) => r.review_text).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-slate-500 hover:text-slate-900">← All orders</Link>
      </div>

      <PageHeader
        title={order.order_code || 'Order'}
        description={client ? `${client.name} · ${client.platform}` : undefined}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={order.status === 'active' ? 'emerald' : order.status === 'completed' ? 'blue' : order.status === 'paused' ? 'amber' : 'slate'}>
              {order.status}
            </Badge>
            {!editMode && (
              <ButtonLink href={`/admin/orders/${order.id}?mode=edit`} variant="outline">
                <PencilIcon size={14} /> Edit
              </ButtonLink>
            )}
            <form action={deleteOrderAction}>
              <input type="hidden" name="id" value={order.id} />
              <ConfirmButton
                message={`Delete this entire order? ${reviews.length} review row${reviews.length === 1 ? '' : 's'} will be deleted. This cannot be undone.`}
                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
              >
                <TrashIcon size={14} /> Delete order
              </ConfirmButton>
            </form>
          </div>
        }
      />

      {sp.ok === 'created' && <Alert tone="success">Order created. The review schedule below was generated automatically.</Alert>}
      {sp.ok === 'updated' && <Alert tone="success">Order updated.</Alert>}
      {sp.ok === 'text_updated' && <Alert tone="success">Review text updated.</Alert>}
      {sp.error && <Alert tone="error">{sp.error}</Alert>}

      {editMode && (
        <EditOrderForm
          order={{
            id: order.id,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            cadence_days: order.cadence_days,
            notes: order.notes,
          }}
          cancelHref={`/admin/orders/${order.id}`}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Quantity" value={`${order.quantity}`} />
        <SummaryCard label="Cadence" value={`${order.cadence_days} days`} />
        <SummaryCard label="Start" value={formatDate(order.start_date)} />
        <SummaryCard label="Live" value={`${live} / ${total}`} subtext={`${pct}% complete`} />
      </div>

      {progress && (
        <Card>
          <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <Stat label="Live" value={live} tone="emerald" />
              <Stat label="In flight" value={progress.reviews_in_flight} tone="blue" />
              <Stat label="Waiting" value={progress.reviews_waiting} tone="slate" />
              <Stat label="Due check" value={progress.reviews_due_check} tone="violet" />
              <Stat label="Dropped" value={progress.reviews_dropped} tone="rose" />
              <Stat label="Replaced" value={progress.reviews_replaced} tone="slate" />
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Order details</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Detail label="Customer" value={order.customer_name || '—'} />
          <Detail label="Customer email" value={order.customer_email || '—'} />
          <Detail label="Order date" value={formatDate(order.order_date)} />
          <Detail label="Created" value={formatDate(order.created_at)} />
          {client?.review_url && (
            <Detail label="Review URL" value={
              <a href={client.review_url} target="_blank" rel="noopener noreferrer" className="text-slate-700 underline-offset-2 hover:underline">
                {client.review_url}
              </a>
            } />
          )}
          {order.notes && <Detail label="Notes" value={order.notes} className="sm:col-span-2" />}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order status</CardTitle></CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Change status to:</span>
            {['active', 'paused', 'completed', 'cancelled']
              .filter((s) => s !== order.status)
              .map((next) => (
                <form action={updateOrderStatusAction} key={next}>
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="status" value={next} />
                  <button type="submit" className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100">
                    {next}
                  </button>
                </form>
              ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Review schedule ({reviews.length})</CardTitle>
            <div className="text-xs text-slate-500">
              {reviewsWithText} of {reviews.length} have review text
            </div>
          </div>
        </CardHeader>
        <div className="divide-y divide-slate-100">
          {reviews.map((r) => (
            <div key={r.id} id={`review-${r.id}`} className="px-5 py-4">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-12 sm:items-center sm:gap-4">
                <div className="text-slate-500 tabular-nums sm:col-span-1">#{r.sequence_number}</div>
                <div className="font-mono text-xs sm:col-span-2">
                  {r.posted_url ? (
                    <a href={r.posted_url} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:underline">
                      {r.review_code}
                    </a>
                  ) : (
                    <span className="text-slate-700">{r.review_code}</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 sm:col-span-2">{formatDate(r.scheduled_date)}</div>
                <div className="text-xs text-slate-600 sm:col-span-2">{r.dispatched_date ? formatDate(r.dispatched_date) : '—'}</div>
                <div className="text-xs text-slate-600 sm:col-span-2">{r.posted_date ? formatDate(r.posted_date) : '—'}</div>
                <div className="truncate text-xs text-slate-600 sm:col-span-2">
                  {r.main_supplier_id ? supplierMap.get(r.main_supplier_id) || '—' : <span className="text-slate-400">—</span>}
                </div>
                <div className="sm:col-span-1 sm:text-right">
                  <StatusBadge status={r.status as ReviewStatus} />
                </div>
              </div>
              <ReviewTextEditor
                reviewId={r.id}
                orderId={order.id}
                currentText={r.review_text}
                wasEditedBySupplier={!!r.review_text_edited_by_supplier}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {subtext && <div className="mt-0.5 text-xs text-slate-500">{subtext}</div>}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string | null | undefined; tone: 'emerald' | 'blue' | 'slate' | 'violet' | 'rose' }) {
  const dotClass = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    slate: 'bg-slate-400',
    violet: 'bg-violet-500',
    rose: 'bg-rose-500',
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="font-semibold text-slate-900 tabular-nums">{value ?? 0}</span>
      <span className="text-slate-500">{label}</span>
    </span>
  );
}

function Detail({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}
