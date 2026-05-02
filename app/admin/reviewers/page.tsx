import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { UsersIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

type ReviewerRow = {
  id: string;
  name: string;
  identifier: string | null;
  phone: string | null;
  location: string | null;
  account_age: string | null;
  platforms: string[] | null;
  lifetime_capacity: number;
  status: string;
  main_supplier_id: string;
  supplier_name: string;
  posted_count: number;
  in_progress_count: number;
  is_at_cap: boolean;
  is_over_cap: boolean;
};

export default async function AdminReviewersPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: reviewerRows }, { data: capRows }, { data: suppliers }] = await Promise.all([
    supabase
      .from('reviewers')
      .select('id, name, identifier, phone, location, account_age, platforms, lifetime_capacity, status, main_supplier_id'),
    supabase
      .from('reviewer_cap_status')
      .select('id, posted_count, in_progress_count, is_at_cap, is_over_cap'),
    supabase.from('main_suppliers').select('id, name').order('name'),
  ]);

  const supplierMap = new Map((suppliers || []).map((s) => [s.id, s.name]));
  const capMap = new Map((capRows || []).map((c) => [c.id, c]));

  let rows: ReviewerRow[] = (reviewerRows || []).map((r) => {
    const cap = capMap.get(r.id);
    return {
      ...r,
      supplier_name: supplierMap.get(r.main_supplier_id) || '—',
      posted_count: Number(cap?.posted_count || 0),
      in_progress_count: Number(cap?.in_progress_count || 0),
      is_at_cap: Boolean(cap?.is_at_cap),
      is_over_cap: Boolean(cap?.is_over_cap),
    };
  });

  // Filters
  if (params.supplier) {
    rows = rows.filter((r) => r.main_supplier_id === params.supplier);
  }
  if (params.filter === 'at_cap') {
    rows = rows.filter((r) => r.is_at_cap);
  } else if (params.filter === 'near_cap') {
    rows = rows.filter((r) => !r.is_at_cap && r.posted_count >= r.lifetime_capacity - 2);
  } else if (params.filter === 'inactive') {
    rows = rows.filter((r) => r.status !== 'active');
  }

  rows.sort((a, b) => {
    if (a.is_at_cap !== b.is_at_cap) return a.is_at_cap ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const totalAtCap = rows.filter((r) => r.is_at_cap).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviewers"
        description="Read-only view of every reviewer across all suppliers. Cap status helps you see who's available and who's exhausted."
      />

      {/* Filter bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Filters</span>
          <FilterChip label="All" href="/admin/reviewers" active={!params.supplier && !params.filter} />
          {(suppliers || []).map((s) => (
            <FilterChip
              key={s.id}
              label={s.name}
              href={`/admin/reviewers?supplier=${s.id}`}
              active={params.supplier === s.id}
            />
          ))}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <FilterChip label="At cap" href="/admin/reviewers?filter=at_cap" active={params.filter === 'at_cap'} />
          <FilterChip label="Near cap" href="/admin/reviewers?filter=near_cap" active={params.filter === 'near_cap'} />
          <FilterChip label="Inactive" href="/admin/reviewers?filter=inactive" active={params.filter === 'inactive'} />
        </div>
      </Card>

      {totalAtCap > 0 && (
        <Alert tone="warning">
          {totalAtCap} reviewer{totalAtCap === 1 ? ' is' : 's are'} at lifetime cap. Their suppliers should rotate them out.
        </Alert>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={22} />}
          title="No reviewers match"
          description="Adjust your filter or ask a supplier to add reviewers via their portal."
        />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            <div className="hidden grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-3">Reviewer</div>
              <div className="col-span-2">Supplier</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Account age</div>
              <div className="col-span-2">Capacity</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            {rows.map((r) => {
              const remaining = Math.max(r.lifetime_capacity - r.posted_count, 0);
              const usedPct = r.lifetime_capacity > 0 ? Math.min(100, Math.round((r.posted_count / r.lifetime_capacity) * 100)) : 0;
              return (
                <div key={r.id} className="grid grid-cols-1 gap-2 px-5 py-3 text-sm sm:grid-cols-12 sm:items-center sm:gap-4">
                  <div className="sm:col-span-3">
                    <div className="font-medium text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.identifier || '—'}
                      {r.phone && <> · {r.phone}</>}
                    </div>
                  </div>
                  <div className="text-slate-700 sm:col-span-2">{r.supplier_name}</div>
                  <div className="text-slate-600 sm:col-span-2">{r.location || '—'}</div>
                  <div className="text-slate-600 sm:col-span-2">
                    {r.account_age ? <span className="capitalize">{r.account_age}</span> : '—'}
                    {r.platforms && r.platforms.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {r.platforms.map((p) => (
                          <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold tabular-nums text-slate-900">{r.posted_count}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-600">{r.lifetime_capacity}</span>
                      {r.in_progress_count > 0 && (
                        <span className="text-slate-500">+ {r.in_progress_count} in flight</span>
                      )}
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={
                          r.is_at_cap
                            ? 'h-full bg-rose-500'
                            : usedPct > 70
                            ? 'h-full bg-amber-500'
                            : 'h-full bg-emerald-500'
                        }
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{remaining} remaining</div>
                  </div>
                  <div className="flex items-center gap-1 sm:col-span-1 sm:justify-end">
                    {r.is_at_cap && <Badge tone="rose">At cap</Badge>}
                    {!r.is_at_cap && r.status === 'active' && <Badge tone="emerald">Active</Badge>}
                    {r.status === 'inactive' && <Badge tone="slate">Inactive</Badge>}
                    {r.status === 'blacklisted' && <Badge tone="rose">Blacklisted</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
        (active
          ? 'bg-slate-900 text-white'
          : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50')
      }
    >
      {label}
    </Link>
  );
}
