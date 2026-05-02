import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdminOrExec } from '@/lib/auth';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarIcon,
  AlertTriangleIcon,
  ClipboardCheckIcon,
  CheckCircleIcon,
  PackageIcon,
  ArrowRightIcon,
} from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const user = await requireAdminOrExec();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Pull all the action-prompt counts in parallel.
  const [
    { count: dueTodayCount },
    { count: overdueCount },
    { count: dispatchedNeedsEntryCount },
    { count: dueForCheckCount },
    { count: droppedAwaitingCount },
    { count: activeOrdersCount },
    { count: livePostedCount },
  ] = await Promise.all([
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .in('status', ['unassigned', 'assigned_to_supplier']),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .lt('scheduled_date', today)
      .in('status', ['unassigned', 'assigned_to_supplier']),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dispatched'),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'due_for_check'),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dropped'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'posted'),
  ]);

  const prompts = [
    {
      condition: (overdueCount ?? 0) > 0,
      tone: 'rose' as const,
      icon: <AlertTriangleIcon size={18} />,
      title: `${overdueCount} review${overdueCount === 1 ? '' : 's'} overdue`,
      description: 'Past their scheduled date and not yet dispatched.',
      action: { label: 'Open today', href: '/admin/today' },
    },
    {
      condition: (dueTodayCount ?? 0) > 0,
      tone: 'blue' as const,
      icon: <CalendarIcon size={18} />,
      title: `${dueTodayCount} review${dueTodayCount === 1 ? '' : 's'} due today`,
      description: 'Assign to a supplier and send the day\'s task list.',
      action: { label: 'Open today', href: '/admin/today' },
    },
    {
      condition: (dispatchedNeedsEntryCount ?? 0) > 0,
      tone: 'amber' as const,
      icon: <ClipboardCheckIcon size={18} />,
      title: `${dispatchedNeedsEntryCount} completion${dispatchedNeedsEntryCount === 1 ? '' : 's'} to record`,
      description: 'Suppliers reported back — enter reviewer and posted URL.',
      action: { label: 'Record completions', href: '/admin/completions' },
    },
    {
      condition: (droppedAwaitingCount ?? 0) > 0,
      tone: 'rose' as const,
      icon: <AlertTriangleIcon size={18} />,
      title: `${droppedAwaitingCount} dropped review${droppedAwaitingCount === 1 ? '' : 's'} need a replacement`,
      description: 'Replacement tasks are auto-created — dispatch them.',
      action: { label: 'View drops', href: '/admin/drops' },
    },
    {
      condition: (dueForCheckCount ?? 0) > 0,
      tone: 'violet' as const,
      icon: <CheckCircleIcon size={18} />,
      title: `${dueForCheckCount} review${dueForCheckCount === 1 ? '' : 's'} due for 20-day check`,
      description: 'Verify they\'re still live, mark dropped if removed.',
      action: { label: 'Run checks', href: '/admin/drops' },
    },
  ].filter((p) => p.condition);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here's what needs your attention today.
        </p>
      </div>

      {/* Action prompts */}
      {prompts.length === 0 ? (
        <Card>
          <CardBody className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircleIcon size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">All caught up</h3>
              <p className="text-sm text-slate-500">
                No overdue tasks, completions to record, or drops to handle right now.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {prompts.map((p, i) => (
            <Link
              key={i}
              href={p.action.href}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card transition hover:shadow-card-hover hover:border-slate-300"
            >
              <Badge tone={p.tone} className="h-9 w-9 shrink-0 justify-center rounded-full p-0">
                {p.icon}
              </Badge>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">{p.title}</h3>
                <p className="text-sm text-slate-500">{p.description}</p>
              </div>
              <div className="hidden items-center gap-1 text-sm font-medium text-slate-500 group-hover:text-slate-900 sm:flex">
                {p.action.label}
                <ArrowRightIcon size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active orders" value={activeOrdersCount ?? 0} icon={<PackageIcon size={18} />} />
        <StatCard label="Reviews live" value={livePostedCount ?? 0} icon={<CheckCircleIcon size={18} />} />
        <StatCard label="Due today" value={dueTodayCount ?? 0} icon={<CalendarIcon size={18} />} />
        <StatCard label="Awaiting check" value={dueForCheckCount ?? 0} icon={<ClipboardCheckIcon size={18} />} />
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-2 sm:grid-cols-2">
          <QuickLink href="/admin/orders" label="New order" description="Create an order for a client" />
          <QuickLink href="/admin/clients" label="Add client" description="Onboard a new business" />
          <QuickLink href="/admin/suppliers" label="Manage suppliers" description="View invite codes & status" />
          <QuickLink href="/admin/analytics" label="View analytics" description="Drop rate, supplier performance" />
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
