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
