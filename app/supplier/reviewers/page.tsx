import { createClient } from '@/lib/supabase/server';
import { requireSupplier } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ButtonLink, Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';
import { UsersIcon, PlusIcon } from '@/components/icons';
import { createReviewerAction, updateReviewerAction, quickStatusAction } from './actions';

export const dynamic = 'force-dynamic';

const PLATFORM_CHOICES = ['Google', 'Trustpilot', 'Justdial', 'Yelp', 'Amazon', 'Other'];
const ACCOUNT_AGES = ['new', 'established', 'veteran'];

type Reviewer = {
  id: string;
  name: string;
  identifier: string | null;
  phone: string | null;
  location: string | null;
  account_age: string | null;
  platforms: string[] | null;
  lifetime_capacity: number;
  status: string;
  notes: string | null;
};

export default async function SupplierReviewersPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  await requireSupplier();
  const supabase = await createClient();

  // Form open state: 'open' for new, or a reviewer id for edit
  const formOpen = params.form;
  const isAddForm = formOpen === 'open';
  const editingId = formOpen && formOpen !== 'open' ? formOpen : null;

  const [{ data: reviewers, error }, { data: capRows }] = await Promise.all([
    supabase
      .from('reviewers')
      .select('id, name, identifier, phone, location, account_age, platforms, lifetime_capacity, status, notes')
      .order('created_at', { ascending: false }),
    supabase.from('reviewer_cap_status').select('id, posted_count, in_progress_count, is_at_cap'),
  ]);
  const capMap = new Map((capRows || []).map((c) => [c.id, c]));

  const editing: Reviewer | null = editingId ? (reviewers || []).find((r) => r.id === editingId) || null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My reviewers"
        description="The pool of people you can assign reviews to. Keep their info up to date — capacity limits and platform compatibility are enforced automatically."
        action={
          formOpen ? (
            <ButtonLink href="/supplier/reviewers" variant="outline">Cancel</ButtonLink>
          ) : (
            <ButtonLink href="/supplier/reviewers?form=open">
              <PlusIcon size={16} /> Add reviewer
            </ButtonLink>
          )
        }
      />

      {params.ok === 'created' && <Alert tone="success">Reviewer added.</Alert>}
      {params.ok === 'updated' && <Alert tone="success">Reviewer updated.</Alert>}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      {(isAddForm || editing) && (
        <Card>
          <CardBody>
            <form
              action={editing ? updateReviewerAction : createReviewerAction}
              className="space-y-4"
            >
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <h3 className="font-semibold text-slate-900">
                {editing ? `Edit ${editing.name}` : 'Add new reviewer'}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor="name" required>
                  <Input id="name" name="name" required autoFocus defaultValue={editing?.name || ''} />
                </FormField>
                <FormField
                  label="Identifier"
                  htmlFor="identifier"
                  hint="Username, account handle, or any internal ID you use"
                >
                  <Input id="identifier" name="identifier" defaultValue={editing?.identifier || ''} />
                </FormField>
                <FormField label="Phone" htmlFor="phone">
                  <Input id="phone" name="phone" defaultValue={editing?.phone || ''} placeholder="+91…" />
                </FormField>
                <FormField label="Location" htmlFor="location">
                  <Input id="location" name="location" defaultValue={editing?.location || ''} />
                </FormField>
                <FormField label="Account age" htmlFor="account_age">
                  <Select id="account_age" name="account_age" defaultValue={editing?.account_age || ''}>
                    <option value="">— not set —</option>
                    {ACCOUNT_AGES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  label="Lifetime capacity"
                  htmlFor="lifetime_capacity"
                  required
                  hint="Max total reviews this person should ever post (10 is typical)"
                >
                  <Input
                    id="lifetime_capacity"
                    name="lifetime_capacity"
                    type="number"
                    min="1"
                    max="1000"
                    required
                    defaultValue={editing?.lifetime_capacity ?? 10}
                  />
                </FormField>
              </div>

              <FormField label="Platforms" hint="Which platforms this reviewer can post on">
                <div className="flex flex-wrap gap-3">
                  {PLATFORM_CHOICES.map((p) => {
                    const selected = editing
                      ? (editing.platforms || []).includes(p)
                      : p === 'Google';
                    return (
                      <label key={p} className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="platforms"
                          value={p}
                          defaultChecked={selected}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        {p}
                      </label>
                    );
                  })}
                </div>
              </FormField>

              {editing && (
                <FormField label="Status" htmlFor="status">
                  <Select id="status" name="status" defaultValue={editing.status}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive — paused</option>
                    <option value="blacklisted">Blacklisted — never use</option>
                  </Select>
                </FormField>
              )}

              <FormField label="Notes" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={2} defaultValue={editing?.notes || ''} />
              </FormField>

              <div className="flex justify-end gap-2 pt-2">
                <ButtonLink href="/supplier/reviewers" variant="outline">Cancel</ButtonLink>
                <Button type="submit">{editing ? 'Save changes' : 'Add reviewer'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : !reviewers || reviewers.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={22} />}
          title="No reviewers yet"
          description="Add the people who will be posting reviews on your behalf."
          action={!formOpen ? { label: 'Add your first reviewer', href: '/supplier/reviewers?form=open' } : undefined}
        />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            <div className="hidden grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-3">Reviewer</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Account age</div>
              <div className="col-span-2">Platforms</div>
              <div className="col-span-2">Capacity</div>
              <div className="col-span-1 text-right" />
            </div>
            {reviewers.map((r) => {
              const cap = capMap.get(r.id);
              const posted = Number(cap?.posted_count || 0);
              const inFlight = Number(cap?.in_progress_count || 0);
              const isAtCap = Boolean(cap?.is_at_cap);
              const usedPct = r.lifetime_capacity > 0
                ? Math.min(100, Math.round((posted / r.lifetime_capacity) * 100))
                : 0;
              return (
                <div key={r.id} className="grid grid-cols-1 gap-3 px-5 py-4 text-sm sm:grid-cols-12 sm:items-center sm:gap-4">
                  <div className="sm:col-span-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{r.name}</span>
                      {r.status === 'active' && !isAtCap && <Badge tone="emerald">Active</Badge>}
                      {r.status === 'active' && isAtCap && <Badge tone="rose">At cap</Badge>}
                      {r.status === 'inactive' && <Badge tone="amber">Inactive</Badge>}
                      {r.status === 'blacklisted' && <Badge tone="rose">Blacklisted</Badge>}
                    </div>
                    {(r.identifier || r.phone) && (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {r.identifier}
                        {r.identifier && r.phone && ' · '}
                        {r.phone}
                      </div>
                    )}
                  </div>
                  <div className="text-slate-600 sm:col-span-2">{r.location || '—'}</div>
                  <div className="text-slate-600 sm:col-span-2">{r.account_age || '—'}</div>
                  <div className="sm:col-span-2">
                    {r.platforms && r.platforms.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.platforms.map((p: string) => (
                          <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs tabular-nums text-slate-700">
                      <span className="font-semibold text-slate-900">{posted}</span>
                      <span className="text-slate-400">/</span>
                      {r.lifetime_capacity}
                      {inFlight > 0 && <span className="ml-1 text-slate-500">+ {inFlight} live</span>}
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={isAtCap ? 'h-full bg-rose-500' : usedPct > 70 ? 'h-full bg-amber-500' : 'h-full bg-emerald-500'}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 sm:col-span-1">
                    <ButtonLink href={`/supplier/reviewers?form=${r.id}`} variant="ghost" size="sm">
                      Edit
                    </ButtonLink>
                    {r.status === 'active' ? (
                      <form action={quickStatusAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="inactive" />
                        <button
                          type="submit"
                          className="text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
                          title="Pause"
                        >
                          Pause
                        </button>
                      </form>
                    ) : r.status === 'inactive' ? (
                      <form action={quickStatusAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="active" />
                        <button
                          type="submit"
                          className="text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
                          title="Reactivate"
                        >
                          Activate
                        </button>
                      </form>
                    ) : null}
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
