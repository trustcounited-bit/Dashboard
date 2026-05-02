import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ButtonLink, Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';
import { BuildingIcon, PlusIcon } from '@/components/icons';
import { formatDate } from '@/lib/utils';
import { createClientAction, updateClientStatusAction } from './actions';

export const dynamic = 'force-dynamic';

const PLATFORMS = ['Google', 'Trustpilot', 'Justdial', 'Yelp', 'Amazon', 'Other'];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const showForm = params.form === 'open';
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, platform, location, contact_name, contact_phone, status, onboarded_date, review_url')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Businesses you supply reviews for."
        action={
          showForm ? (
            <ButtonLink href="/admin/clients" variant="outline">
              Cancel
            </ButtonLink>
          ) : (
            <ButtonLink href="/admin/clients?form=open">
              <PlusIcon size={16} /> Add client
            </ButtonLink>
          )
        }
      />

      {params.ok === 'created' && <Alert tone="success">Client added.</Alert>}
      {params.ok === 'updated' && <Alert tone="success">Client updated.</Alert>}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      {showForm && (
        <Card>
          <CardBody>
            <form action={createClientAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Business name" htmlFor="name" required>
                  <Input id="name" name="name" required autoFocus placeholder="e.g. Sunrise Cafe Bandra" />
                </FormField>
                <FormField label="Platform" htmlFor="platform" required>
                  <Select id="platform" name="platform" defaultValue="Google">
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Review URL" htmlFor="review_url" hint="Public URL where reviewers will leave the review">
                  <Input id="review_url" name="review_url" type="url" placeholder="https://..." />
                </FormField>
                <FormField label="Location" htmlFor="location">
                  <Input id="location" name="location" placeholder="City, area" />
                </FormField>
                <FormField label="Contact name" htmlFor="contact_name">
                  <Input id="contact_name" name="contact_name" />
                </FormField>
                <FormField label="Contact phone" htmlFor="contact_phone">
                  <Input id="contact_phone" name="contact_phone" placeholder="+91…" />
                </FormField>
              </div>
              <FormField label="Notes" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={2} />
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <ButtonLink href="/admin/clients" variant="outline">
                  Cancel
                </ButtonLink>
                <Button type="submit">Save client</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon size={22} />}
          title="No clients yet"
          description="Add the first business you'll be supplying reviews for."
          action={!showForm ? { label: 'Add your first client', href: '/admin/clients?form=open' } : undefined}
        />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            <div className="hidden grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-4">Business</div>
              <div className="col-span-2">Platform</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-1">Onboarded</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            {clients.map((c) => (
              <div key={c.id} className="grid grid-cols-1 gap-2 px-5 py-4 text-sm sm:grid-cols-12 sm:items-center sm:gap-4">
                <div className="sm:col-span-4">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  {c.review_url && (
                    <a href={c.review_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-xs text-slate-500 hover:text-slate-700">
                      {c.review_url}
                    </a>
                  )}
                </div>
                <div className="text-slate-600 sm:col-span-2">{c.platform}</div>
                <div className="text-slate-600 sm:col-span-2">{c.location || '—'}</div>
                <div className="text-slate-600 sm:col-span-2">
                  {c.contact_name ? (
                    <>
                      <div className="truncate">{c.contact_name}</div>
                      {c.contact_phone && <div className="text-xs text-slate-500">{c.contact_phone}</div>}
                    </>
                  ) : '—'}
                </div>
                <div className="text-xs text-slate-500 sm:col-span-1">{formatDate(c.onboarded_date)}</div>
                <div className="flex items-center gap-2 sm:col-span-1 sm:justify-end">
                  <Badge tone={c.status === 'active' ? 'emerald' : c.status === 'paused' ? 'amber' : 'slate'}>
                    {c.status}
                  </Badge>
                  <ClientStatusToggle id={c.id} status={c.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ClientStatusToggle({ id, status }: { id: string; status: string }) {
  const next = status === 'active' ? 'paused' : status === 'paused' ? 'archived' : 'active';
  return (
    <form action={updateClientStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <button type="submit" className="text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline" title={`Mark as ${next}`}>
        →&nbsp;{next}
      </button>
    </form>
  );
}
