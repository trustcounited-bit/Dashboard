import Link from 'next/link';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ButtonLink, Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField, Input, Textarea } from '@/components/ui/form';
import { CopyButton } from '@/components/ui/copy-button';
import { NetworkIcon, PlusIcon, PencilIcon, TrashIcon } from '@/components/icons';
import { formatDate } from '@/lib/utils';
import {
  createSupplierAction,
  updateSupplierAction,
  updateSupplierStatusAction,
  deleteSupplierAction,
} from './actions';

export const dynamic = 'force-dynamic';

async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; edit?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const showAddForm = params.form === 'open';
  const editId = params.edit || null;
  const supabase = await createClient();
  const origin = await getSiteOrigin();

  const { data: suppliers, error } = await supabase
    .from('main_suppliers')
    .select('id, name, contact_name, email, phone, region, invite_code, commission_rate, status, onboarded_date, notes')
    .order('created_at', { ascending: false });

  const editingSupplier = editId ? (suppliers || []).find((s) => s.id === editId) || null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Main suppliers"
        description="Your network contacts. Each supplier gets a unique invite code — share the signup link with them so they can log into their own portal."
        action={
          showAddForm || editingSupplier ? (
            <ButtonLink href="/admin/suppliers" variant="outline">Cancel</ButtonLink>
          ) : (
            <ButtonLink href="/admin/suppliers?form=open">
              <PlusIcon size={16} /> Add supplier
            </ButtonLink>
          )
        }
      />

      {params.ok === 'created' && (
        <Alert tone="success" title="Supplier added">
          An invite code was auto-generated. Use the &ldquo;Copy signup link&rdquo; button below to share it with them.
        </Alert>
      )}
      {params.ok === 'updated' && <Alert tone="success">Supplier updated.</Alert>}
      {params.ok === 'deleted' && <Alert tone="success">Supplier deleted.</Alert>}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      {(showAddForm || editingSupplier) && (
        <Card>
          <CardBody>
            <form
              action={editingSupplier ? updateSupplierAction : createSupplierAction}
              className="space-y-4"
            >
              {editingSupplier && <input type="hidden" name="id" value={editingSupplier.id} />}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Supplier name" htmlFor="name" required>
                  <Input id="name" name="name" required autoFocus defaultValue={editingSupplier?.name || ''} placeholder="e.g. Mumbai Network 1" />
                </FormField>
                <FormField label="Email" htmlFor="email" required hint="They'll use this email to sign up">
                  <Input id="email" name="email" type="email" required defaultValue={editingSupplier?.email || ''} />
                </FormField>
                <FormField label="Contact name" htmlFor="contact_name">
                  <Input id="contact_name" name="contact_name" defaultValue={editingSupplier?.contact_name || ''} />
                </FormField>
                <FormField label="Phone" htmlFor="phone">
                  <Input id="phone" name="phone" defaultValue={editingSupplier?.phone || ''} placeholder="+91…" />
                </FormField>
                <FormField label="Region" htmlFor="region">
                  <Input id="region" name="region" defaultValue={editingSupplier?.region || ''} placeholder="e.g. Mumbai West" />
                </FormField>
                <FormField label="Commission rate (%)" htmlFor="commission_rate">
                  <Input
                    id="commission_rate"
                    name="commission_rate"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    defaultValue={editingSupplier?.commission_rate ?? 0}
                  />
                </FormField>
              </div>
              <FormField label="Notes" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={2} defaultValue={editingSupplier?.notes || ''} />
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <ButtonLink href="/admin/suppliers" variant="outline">Cancel</ButtonLink>
                <Button type="submit">{editingSupplier ? 'Save changes' : 'Save supplier'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : !suppliers || suppliers.length === 0 ? (
        <EmptyState
          icon={<NetworkIcon size={22} />}
          title="No suppliers yet"
          description="Add a Main Supplier to start building your network. Each one gets their own portal and reviewer pool."
          action={!showAddForm ? { label: 'Add your first supplier', href: '/admin/suppliers?form=open' } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => {
            const signupLink = s.invite_code ? `${origin}/login?invite=${s.invite_code}` : null;
            return (
              <Card key={s.id}>
                <CardBody className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{s.name}</h3>
                        <Badge tone={s.status === 'active' ? 'emerald' : s.status === 'paused' ? 'amber' : 'rose'}>
                          {s.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                        {s.contact_name && <span>{s.contact_name}</span>}
                        <span className="text-slate-300">·</span>
                        <span>{s.email}</span>
                        {s.phone && (<><span className="text-slate-300">·</span><span>{s.phone}</span></>)}
                        {s.region && (<><span className="text-slate-300">·</span><span>{s.region}</span></>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/suppliers?edit=${s.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        title="Edit supplier"
                      >
                        <PencilIcon size={14} /> Edit
                      </Link>
                      <form action={deleteSupplierAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton
                          message={`Delete supplier "${s.name}"? This cannot be undone. If they have any reviews or reviewers linked, you'll be asked to mark them suspended instead.`}
                          className="inline-flex items-center rounded-md border border-rose-300 bg-white p-1.5 text-rose-700 hover:bg-rose-50"
                          title="Delete supplier"
                        >
                          <TrashIcon size={14} />
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    <div>Onboarded {formatDate(s.onboarded_date)}</div>
                    {s.commission_rate ? <div className="mt-0.5">Commission: {s.commission_rate}%</div> : null}
                  </div>

                  {/* Invite & signup */}
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Invite code</div>
                        <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                          {s.invite_code || '— pending —'}
                        </div>
                      </div>
                      {s.invite_code && <CopyButton value={s.invite_code} label="Copy code" />}
                    </div>
                    {signupLink && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Signup link</div>
                          <div className="mt-0.5 truncate font-mono text-xs text-slate-700">{signupLink}</div>
                        </div>
                        <CopyButton value={signupLink} label="Copy signup link" />
                      </div>
                    )}
                  </div>

                  {/* Status controls */}
                  <div className="flex items-center justify-end gap-2">
                    <SupplierStatusForm id={s.id} status={s.status} />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupplierStatusForm({ id, status }: { id: string; status: string }) {
  const options = ['active', 'paused', 'suspended'].filter((s) => s !== status);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500">Set status:</span>
      {options.map((next) => (
        <form action={updateSupplierStatusAction} key={next}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={next} />
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
          >
            {next}
          </button>
        </form>
      ))}
    </div>
  );
}
