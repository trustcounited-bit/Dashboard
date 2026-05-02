import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireSupplier } from '@/lib/auth';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarIcon,
  ClipboardCheckIcon,
  CheckCircleIcon,
  UsersIcon,
  ArrowRightIcon,
} from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function SupplierDashboard() {
  const user = await requireSupplier();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // RLS scopes these queries to the supplier's own data automatically.
  const [
    { count: dispatchedTodayCount },
    { count: needsEntryCount },
    { count: livePostedCount },
    { count: activeReviewersCount },
    { data: supplierInfo },
  ] = await Promise.all([
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('dispatched_date', today)
      .eq('status', 'dispatched'),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dispatched'),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'posted'),
    supabase
      .from('reviewers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    user.main_supplier_id
      ? supabase
          .from('main_suppliers')
          .select('name, region')
          .eq('id', user.main_supplier_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {supplierInfo?.name ? supplierInfo.name : 'Supplier dashboard'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {(needsEntryCount ?? 0) > 0
            ? `${needsEntryCount} review${needsEntryCount === 1 ? '' : 's'} waiting for completion details.`
            : "You're all caught up — no pending entries."}
        </p>
      </div>

      {/* Today's tasks card */}
      <Link
        href="/supplier/today"
        className="group block rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-card transition hover:shadow-card-hover hover:border-slate-300"
      >
        <div className="flex items-center gap-4">
          <Badge tone="blue" className="h-10 w-10 shrink-0 justify-center rounded-full p-0">
            <CalendarIcon size={20} />
          </Badge>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900">
              {dispatchedTodayCount ?? 0} task{dispatchedTodayCount === 1 ? '' : 's'} dispatched today
            </h3>
            <p className="text-sm text-slate-500">
              View today's list and update each as your reviewers complete them.
            </p>
          </div>
          <div className="hidden items-center gap-1 text-sm font-medium text-slate-500 group-hover:text-slate-900 sm:flex">
            Open
            <ArrowRightIcon size={16} />
          </div>
        </div>
      </Link>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending entry"
          value={needsEntryCount ?? 0}
          icon={<ClipboardCheckIcon size={18} />}
        />
        <StatCard
          label="Reviews live"
          value={livePostedCount ?? 0}
          icon={<CheckCircleIcon size={18} />}
        />
        <StatCard
          label="Active reviewers"
          value={activeReviewersCount ?? 0}
          icon={<UsersIcon size={18} />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2">
          <QuickLink
            href="/supplier/today"
            label="Today's tasks"
            description="What's been dispatched to you"
          />
          <QuickLink
            href="/supplier/reviewers"
            label="My reviewers"
            description="Manage your reviewer pool"
          />
          <QuickLink
            href="/supplier/history"
            label="Review history"
            description="What you've completed"
          />
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-slate-400">{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-md px-3 py-2.5 transition hover:bg-slate-50"
    >
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <ArrowRightIcon size={16} className="text-slate-400 group-hover:text-slate-900" />
    </Link>
  );
}
