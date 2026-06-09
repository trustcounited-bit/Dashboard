'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdminOrExec } from '@/lib/auth';

const PLATFORMS = ['Google', 'Trustpilot', 'Justdial', 'Yelp', 'Amazon', 'Other'] as const;
const STATUSES = ['active', 'paused', 'archived'] as const;

function fail(message: string, params: URLSearchParams) {
  params.set('error', message);
  redirect(`/admin/clients?${params.toString()}`);
}

export async function createClientAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const name = String(formData.get('name') || '').trim();
  const platform = String(formData.get('platform') || 'Google');
  const review_url = String(formData.get('review_url') || '').trim() || null;
  const location = String(formData.get('location') || '').trim() || null;
  const contact_name = String(formData.get('contact_name') || '').trim() || null;
  const contact_phone = String(formData.get('contact_phone') || '').trim() || null;
  const notes = String(formData.get('notes') || '').trim() || null;

  const params = new URLSearchParams({ form: 'open' });

  if (!name) return fail('Business name is required', params);
  if (!PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
    return fail('Invalid platform', params);
  }

  const { error } = await supabase.from('clients').insert({
    name,
    platform,
    review_url,
    location,
    contact_name,
    contact_phone,
    notes,
  });

  if (error) return fail(error.message, params);

  revalidatePath('/admin/clients');
  redirect('/admin/clients?ok=created');
}

export async function updateClientAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '').trim();
  const platform = String(formData.get('platform') || 'Google');
  const review_url = String(formData.get('review_url') || '').trim() || null;
  const location = String(formData.get('location') || '').trim() || null;
  const contact_name = String(formData.get('contact_name') || '').trim() || null;
  const contact_phone = String(formData.get('contact_phone') || '').trim() || null;
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!id) redirect('/admin/clients?error=Missing+client+id');

  const editParams = new URLSearchParams({ edit: id });
  if (!name) return fail('Business name is required', editParams);
  if (!PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
    return fail('Invalid platform', editParams);
  }

  const { error } = await supabase
    .from('clients')
    .update({ name, platform, review_url, location, contact_name, contact_phone, notes })
    .eq('id', id);

  if (error) return fail(error.message, editParams);

  revalidatePath('/admin/clients');
  redirect('/admin/clients?ok=updated');
}

export async function updateClientStatusAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || '');

  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    redirect('/admin/clients?error=Invalid+status+update');
  }

  const { error } = await supabase
    .from('clients')
    .update({ status })
    .eq('id', id);

  if (error) {
    redirect('/admin/clients?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/clients');
  redirect('/admin/clients?ok=updated');
}

/**
 * Hard delete a client. If the client has orders, the FK constraint will block this
 * and the user will get an error — they should archive instead.
 */
export async function deleteClientAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  if (!id) redirect('/admin/clients?error=Missing+client+id');

  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) {
    // Likely FK violation if orders reference this client
    redirect(
      '/admin/clients?error=' +
      encodeURIComponent(
        error.message.includes('foreign key') || error.code === '23503'
          ? 'This client has orders associated with it. Archive it instead, or delete its orders first.'
          : error.message
      )
    );
  }

  revalidatePath('/admin/clients');
  redirect('/admin/clients?ok=deleted');
}
