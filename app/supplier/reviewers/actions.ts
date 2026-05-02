'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSupplier } from '@/lib/auth';

const STATUSES = ['active', 'inactive', 'blacklisted'] as const;
const ACCOUNT_AGES = ['new', 'established', 'veteran'] as const;
const PLATFORM_CHOICES = ['Google', 'Trustpilot', 'Justdial', 'Yelp', 'Amazon', 'Other'];

function fail(message: string, openId?: string) {
  const sp = new URLSearchParams({ form: openId || 'open', error: message });
  redirect('/supplier/reviewers?' + sp.toString());
}

export async function createReviewerAction(formData: FormData) {
  const user = await requireSupplier();
  const supabase = await createClient();

  if (!user.main_supplier_id) {
    return fail('Your account is not linked to a supplier yet. Contact your admin.');
  }

  const name = String(formData.get('name') || '').trim();
  const identifier = String(formData.get('identifier') || '').trim() || null;
  const phone = String(formData.get('phone') || '').trim() || null;
  const location = String(formData.get('location') || '').trim() || null;
  const account_age = String(formData.get('account_age') || '').trim() || null;
  const lifetimeRaw = String(formData.get('lifetime_capacity') || '10');
  const platforms = formData.getAll('platforms').map((v) => String(v));
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!name) return fail('Reviewer name is required');
  if (account_age && !ACCOUNT_AGES.includes(account_age as (typeof ACCOUNT_AGES)[number])) {
    return fail('Invalid account age');
  }
  const lifetime_capacity = parseInt(lifetimeRaw, 10);
  if (!Number.isFinite(lifetime_capacity) || lifetime_capacity < 1 || lifetime_capacity > 1000) {
    return fail('Lifetime capacity must be between 1 and 1000');
  }
  const validPlatforms = platforms.filter((p) => PLATFORM_CHOICES.includes(p));

  const { error } = await supabase.from('reviewers').insert({
    main_supplier_id: user.main_supplier_id,
    name,
    identifier,
    phone,
    location,
    account_age,
    lifetime_capacity,
    platforms: validPlatforms.length > 0 ? validPlatforms : ['Google'],
    notes,
  });

  if (error) return fail(error.message);

  revalidatePath('/supplier/reviewers');
  redirect('/supplier/reviewers?ok=created');
}

export async function updateReviewerAction(formData: FormData) {
  await requireSupplier();
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  if (!id) return fail('Missing reviewer id');

  const name = String(formData.get('name') || '').trim();
  const identifier = String(formData.get('identifier') || '').trim() || null;
  const phone = String(formData.get('phone') || '').trim() || null;
  const location = String(formData.get('location') || '').trim() || null;
  const account_age = String(formData.get('account_age') || '').trim() || null;
  const lifetimeRaw = String(formData.get('lifetime_capacity') || '10');
  const platforms = formData.getAll('platforms').map((v) => String(v));
  const notes = String(formData.get('notes') || '').trim() || null;
  const status = String(formData.get('status') || 'active');

  if (!name) return fail('Reviewer name is required', id);
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return fail('Invalid status', id);
  const lifetime_capacity = parseInt(lifetimeRaw, 10);
  if (!Number.isFinite(lifetime_capacity) || lifetime_capacity < 1 || lifetime_capacity > 1000) {
    return fail('Lifetime capacity must be between 1 and 1000', id);
  }
  const validPlatforms = platforms.filter((p) => PLATFORM_CHOICES.includes(p));

  // RLS will block this if it's not the supplier's own reviewer
  const { error } = await supabase
    .from('reviewers')
    .update({
      name,
      identifier,
      phone,
      location,
      account_age: account_age || null,
      lifetime_capacity,
      platforms: validPlatforms.length > 0 ? validPlatforms : ['Google'],
      notes,
      status,
    })
    .eq('id', id);

  if (error) return fail(error.message, id);

  revalidatePath('/supplier/reviewers');
  redirect('/supplier/reviewers?ok=updated');
}

export async function quickStatusAction(formData: FormData) {
  await requireSupplier();
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || '');
  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    redirect('/supplier/reviewers?error=Invalid+status');
  }
  const { error } = await supabase.from('reviewers').update({ status }).eq('id', id);
  if (error) redirect('/supplier/reviewers?error=' + encodeURIComponent(error.message));
  revalidatePath('/supplier/reviewers');
  redirect('/supplier/reviewers?ok=updated');
}
