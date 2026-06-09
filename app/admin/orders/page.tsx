import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PackageIcon, PlusIcon, ArrowRightIcon } from '@/components/icons';
import { formatDate } from '@/lib/utils';
import { NewOrderForm } from './new-order-form';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const showForm = params.form === 'open';
  const supabase = await createClient();

  const [ordersRes, clientsRes] = await Promise.all([
    supabase.from('order_progress').select('*').order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name, platform, status')
      .neq('status', 'archived')
      .order('name'),
  ]);

  const orders = ordersRes.data || [];
  const clients = clientsRes.data || [];

  const { data: clientLookup } = await supabase.from('clients').select('id, name, platform');
  const clientMap = new Map((clientLookup || []).map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Each order is exploded into individual review tasks based on quantity and cadence. Suppliers are not pre-assigned — assignment happens daily on the Today page."
        action={
          showForm ? (
            <ButtonLink href="/admin/orders" variant="outline">Cancel</ButtonLink>
          ) : (
            <ButtonLink href="/admin/orders?form=open">
              <PlusIcon size={16} /> New order
            </ButtonLink>
          )
        }
      />

      {params.ok === 'created' && <Alert tone="success">Order created and review schedule generated.</Alert>}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      {showForm && <NewOrderForm clients={clients} />}

      {orders.length === 0 ? (
        <EmptyState
          icon={<PackageIcon size={22} />}
          title="No orders yet"
          description="Create your first order to start scheduling reviews."
          action={!showForm && clients.length > 0 ? { label: 'New order', href: '/admin/orders?form=open' } : undefined}
        />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            <div className="hidden grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-3">Order</div>
              <div className="col-span-3">Client</div>
              <div className="col-span-2">Progress</div>
              <div className="col-span-2">Started</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right" />
            </div>
            {orders.map((o) => {
              const client = clientMap.get(o.client_id);
              const live = Number(o.reviews_live || 0);
              const total = Number(o.quantity || 0);
              const pct = total > 0 ? Math.round((live / total) * 100) : 0;
              const inFlight = Number(o.reviews_in_flight || 0);
              const waiting = Number(o.reviews_waiting || 0);
              return (
                <Link
                  key={o.order_id}
                  href={`/admin/orders/${o.order_id}`}
                  className="grid grid-cols-1 gap-2 px-5 py-4 text-sm transition hover:bg-slate-50 sm:grid-cols-12 sm:items-center sm:gap-4"
                >
                  <div className="sm:col-span-3">
                    <div className="font-mono text-xs font-semibold text-slate-900">{o.order_code || '—'}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{o.quantity} reviews · {o.cadence_days}d cadence</div>
                  </div>
                  <div className="sm:col-span-3">
                    <div className="font-medium text-slate-900">{client?.name || '—'}</div>
                    <div className="text-xs text-slate-500">{client?.platform || ''}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 tabular-nums text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">{live}</span>
                      <span className="text-slate-400">/</span>
                      <span>{total} live</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    {(inFlight > 0 || waiting > 0) && (
                      <div className="mt-1 text-[11px] text-slate-500">
                        {inFlight > 0 && <span>{inFlight} in flight</span>}
                        {inFlight > 0 && waiting > 0 && <span> · </span>}
                        {waiting > 0 && <span>{waiting} waiting</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 sm:col-span-2">{formatDate(o.start_date)}</div>
                  <div className="sm:col-span-1">
                    <Badge tone={o.status === 'active' ? 'emerald' : o.status === 'completed' ? 'blue' : o.status === 'paused' ? 'amber' : 'slate'}>
                      {o.status}
                    </Badge>
                  </div>
                  <div className="hidden text-slate-400 sm:col-span-1 sm:flex sm:justify-end">
                    <ArrowRightIcon size={16} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
