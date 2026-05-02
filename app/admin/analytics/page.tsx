import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChartIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

type SupplierStats = {
  id: string;
  name: string;
  status: string;
  posted: number;
  in_flight: number;
  dropped: number;
  total: number;
  drop_rate: number;
};

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Counts across the whole org
  const [
    { count: totalOrders },
    { count: activeOrders },
    { count: totalPosted },
    { count: totalDropped },
    { count: totalDispatched },
    { count: totalReplaced },
    { data: suppliers },
    { data: reviewsBySupplier },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'posted'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'dropped'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).in('status', ['assigned_to_supplier', 'dispatched']),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'replaced'),
    supabase.from('main_suppliers').select('id, name, status').order('name'),
    // Pull review status breakdown per supplier (limit to last ~1000 to bound result)
    supabase
      .from('reviews')
      .select('main_supplier_id, status')
      .not('main_supplier_id', 'is', null)
      .limit(5000),
  ]);

  // Org-level drop rate: dropped / (posted + dropped)
  const postedAndDropped = (totalPosted || 0) + (totalDropped || 0);
  const dropRate = postedAndDropped > 0 ? ((totalDropped || 0) / postedAndDropped) * 100 : 0;

  // Group reviews by supplier
  const supplierStats = new Map<string, SupplierStats>();
  (suppliers || []).forEach((s) => {
    supplierStats.set(s.id, {
      id: s.id,
      name: s.name,
      status: s.status,
      posted: 0,
      in_flight: 0,
      dropped: 0,
      total: 0,
      drop_rate: 0,
    });
  });
  (reviewsBySupplier || []).forEach((r) => {
    if (!r.main_supplier_id) return;
    const stat = supplierStats.get(r.main_supplier_id);
    if (!stat) return;
    stat.total++;
    if (r.status === 'posted') stat.posted++;
    else if (r.status === 'dropped') stat.dropped++;
    else if (r.status === 'assigned_to_supplier' || r.status === 'dispatched') stat.in_flight++;
  });
  for (const stat of supplierStats.values()) {
    const denom = stat.posted + stat.dropped;
    stat.drop_rate = denom > 0 ? (stat.dropped / denom) * 100 : 0;
  }
  const supplierRanking = Array.from(supplierStats.values()).sort((a, b) => b.posted - a.posted);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="High-level numbers across orders, reviews, and supplier performance."
      />

      {/* Top-level stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total orders" value={totalOrders ?? 0} />
        <Stat label="Active orders" value={activeOrders ?? 0} />
        <Stat label="Reviews live" value={totalPosted ?? 0} subtext={`${totalDispatched ?? 0} in flight`} />
        <Stat label="Drop rate" value={`${dropRate.toFixed(1)}%`} subtext={`${totalDropped ?? 0} dropped, ${totalReplaced ?? 0} replaced`} tone={dropRate > 10 ? 'rose' : 'slate'} />
      </div>

      {(totalOrders ?? 0) === 0 && (
        <Alert tone="info">
          You don&rsquo;t have any orders yet. Once you create orders and start dispatching reviews, this page will fill in.
        </Alert>
      )}

      {/* Supplier performance */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier performance</CardTitle>
        </CardHeader>
        {supplierRanking.length === 0 ? (
          <CardBody>
            <EmptyState title="No suppliers yet" description="Add a supplier to see performance numbers." />
          </CardBody>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="hidden grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-3">Supplier</div>
              <div className="col-span-2">Posted</div>
              <div className="col-span-2">In flight</div>
              <div className="col-span-2">Dropped</div>
              <div className="col-span-2">Drop rate</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            {supplierRanking.map((s) => (
              <div key={s.id} className="grid grid-cols-1 gap-2 px-5 py-3 text-sm sm:grid-cols-12 sm:items-center sm:gap-4">
                <div className="font-medium text-slate-900 sm:col-span-3">{s.name}</div>
                <div className="font-semibold tabular-nums text-slate-900 sm:col-span-2">{s.posted}</div>
                <div className="tabular-nums text-slate-700 sm:col-span-2">{s.in_flight}</div>
                <div className="tabular-nums text-slate-700 sm:col-span-2">{s.dropped}</div>
                <div className="sm:col-span-2">
                  <span className={'font-medium tabular-nums ' + (s.drop_rate > 10 ? 'text-rose-700' : s.drop_rate > 5 ? 'text-amber-700' : 'text-emerald-700')}>
                    {s.drop_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="sm:col-span-1 sm:text-right">
                  <Badge tone={s.status === 'active' ? 'emerald' : s.status === 'paused' ? 'amber' : 'rose'}>{s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500">
        Numbers reflect lifetime data. Drop rate is calculated as dropped &divide; (posted + dropped) — replaced reviews aren&rsquo;t counted in either bucket.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  subtext,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: 'slate' | 'emerald' | 'rose';
}) {
  const valueClass = tone === 'rose' ? 'text-rose-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</div>
      {subtext && <div className="mt-0.5 text-xs text-slate-500">{subtext}</div>}
    </div>
  );
}
