'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  HomeIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  PackageIcon,
  BuildingIcon,
  NetworkIcon,
  UsersIcon,
  AlertTriangleIcon,
  BarChartIcon,
  HistoryIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
} from '@/components/icons';
import type { Role } from '@/lib/auth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: HomeIcon },
  { href: '/admin/today', label: 'Today', icon: CalendarIcon },
  { href: '/admin/completions', label: 'Completions', icon: ClipboardCheckIcon },
  { href: '/admin/orders', label: 'Orders', icon: PackageIcon },
  { href: '/admin/clients', label: 'Clients', icon: BuildingIcon },
  { href: '/admin/suppliers', label: 'Suppliers', icon: NetworkIcon },
  { href: '/admin/reviewers', label: 'Reviewers', icon: UsersIcon },
  { href: '/admin/drops', label: 'Drops & checks', icon: AlertTriangleIcon },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChartIcon },
];

const SUPPLIER_NAV: NavItem[] = [
  { href: '/supplier/dashboard', label: 'Overview', icon: HomeIcon },
  { href: '/supplier/today', label: "Today's tasks", icon: CalendarIcon },
  { href: '/supplier/reviewers', label: 'My reviewers', icon: UsersIcon },
  { href: '/supplier/history', label: 'History', icon: HistoryIcon },
];

export function Sidebar({
  role,
  userEmail,
  userName,
}: {
  role: Role;
  userEmail: string;
  userName: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = role === 'main_supplier' ? SUPPLIER_NAV : ADMIN_NAV;
  const roleLabel =
    role === 'admin'
      ? 'Admin'
      : role === 'executive'
      ? 'Executive'
      : 'Main Supplier';

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
            R
          </div>
          <span className="text-sm font-semibold text-slate-900">Review Network</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <MenuIcon size={20} />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              R
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight text-slate-900">
                Review Network
              </div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                {roleLabel}
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User block */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {(userName || userEmail).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">
                {userName || userEmail.split('@')[0]}
              </div>
              <div className="truncate text-xs text-slate-500">{userEmail}</div>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOutIcon size={18} className="text-slate-400" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
