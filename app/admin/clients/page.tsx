import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ButtonLink, Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';
import { BuildingIcon, PlusIcon, PencilIcon, TrashIcon } from '@/components/icons';
import { formatDate } from '@/lib/utils';
import {
  createClientAction,
  updateClientAction,
  updateClientStatusAction,
  deleteClientAction,
} from './actions';

export const dynamic = 'force-dynamic';

const PLATFORMS = ['Google', 'Trustpilot', 'Justdial', 'Yelp', 'Amazon', 'Other'];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; edit?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const showAddForm = params.form === 'open';
  const editId = params.edit || null;
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, platform, location, contact_name, contact_phone, status, onboarded_date, review_url, notes')
    .order('created_at', { ascending: false });

  const editingClient = editId ? (clients || []).find((c) => c.id === editId) || null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Businesses you supply reviews for."
        action={
          showAddForm || editingClient ? (
            <ButtonLink href="/admin/clients" variant="outline">Cancel</ButtonLink>
          ) : (
            <ButtonLink href="/admin/clients?form=open">
              <PlusIcon size={16} /> Add client
            </ButtonLink>
          )
        }
      />

      {params.ok === 'created' && <Alert tone="success">Client added.</Alert>}
      {params.ok === 'updated' && <Alert tone="success">Client updated.</Alert>}
      {params.ok === 'deleted' && <Alert tone="success">Client deleted.</Alert>}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      {(showAddForm || editingClient) && (
        <Card>
          <CardBody>
            <form
              action={editingClient ? updateClientAction : createClientAction}
              className="space-y-4"
            >
              {editingClient && <input type="hidden" name="id" value={editingClient.id} />}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Business name" htmlFor="name" required>
                  <Input
                    id="name"
                    name="name"
                    required
                    autoFocus
                    defaultValue={editingClient?.name || ''}
                    placeholder="e.g. Sunrise Cafe Bandra"
                  />
                </FormField>
                <FormField label="Platform" htmlFor="platform" required>
                  <Select id="platform" name="platform" defaultValue={editingClient?.platform || 'Google'}>
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Review URL" htmlFor="review_url" hint="Public URL where reviewers will leave the review">
                  <Input
                    id="review_url"
                    name="review_url"
                    type="url"
                    defaultValue={editingClient?.review_url || ''}
                    placeholder="https://..."
                  />
                </FormField>
                <FormField label="Location" htmlFor="location">
                  <Input id="location" name="location" defaultValue={editingClient?.location || ''} placeholder="City, area" />
                </FormField>
                <FormField label="Contact name" htmlFor="contact_name">
                  <Input id="contact_name" name="contact_name" defaultValue={editingClient?.contact_name || ''} />
                </FormField>
                <FormField label="Contact phone" htmlFor="contact_phone">
                  <Input id="contact_phone" name="contact_phone" defaultValue={editingClient?.contact_phone || ''} placeholder="+91…" />
                </FormField>
              </div>
              <FormField label="Notes" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={2} defaultValue={editingClient?.notes || ''} />
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <ButtonLink href="/admin/clients" variant="outline">Cancel</ButtonLink>
                <Button type="submit">{editingClient ? 'Save changes' : 'Save client'}</Button>
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
          action={!showAddForm ? { label: 'Add your first client', href: '/admin/clients?form=open' } : undefined}
        />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            <div className="hidden grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-3">Business</div>
              <div className="col-span-2">Platform</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {clients.map((c) => (
              <div key={c.id} className="grid grid-cols-1 gap-2 px-5 py-4 text-sm sm:grid-cols-12 sm:items-center sm:gap-4">
                <div className="sm:col-span-3">
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
                <div className="sm:col-span-1">
                  <Badge tone={c.status === 'active' ? 'emerald' : c.status === 'paused' ? 'amber' : 'slate'}>
                    {c.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1 sm:col-span-2">
                  <ClientStatusToggle id={c.id} status={c.status} />
                  <Link
                    href={`/admin/clients?edit=${c.id}`}
                    className="inline-flex items-center rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    title="Edit"
                  >
                    <PencilIcon size={14} />
                  </Link>
                  <form action={deleteClientAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton
                      message={`Delete "${c.name}"? This cannot be undone. If they have orders, you'll need to delete those first or archive this client instead.`}
                      className="inline-flex items-center rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                      title="Delete"
                    >
                      <TrashIcon size={14} />
                    </ConfirmButton>
                  </form>
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
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        title={`Mark as ${next}`}
      >
        → {next}
      </button>
    </form>
  );
}
