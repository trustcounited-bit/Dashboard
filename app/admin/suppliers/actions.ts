'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdminOrExec } from '@/lib/auth';

const STATUSES = ['active', 'paused', 'suspended'] as const;

function fail(message: string) {
  redirect('/admin/suppliers?form=open&error=' + encodeURIComponent(message));
}

export async function createSupplierAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const contact_name = String(formData.get('contact_name') || '').trim() || null;
  const phone = String(formData.get('phone') || '').trim() || null;
  const region = String(formData.get('region') || '').trim() || null;
  const commission_rate = parseFloat(String(formData.get('commission_rate') || '0')) || 0;
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!name) return fail('Supplier name is required');
  if (!email) return fail('Supplier email is required (used for signup)');
  if (commission_rate < 0 || commission_rate > 100) {
    return fail('Commission rate must be between 0 and 100');
  }

  const { error } = await supabase.from('main_suppliers').insert({
    name,
    email,
    contact_name,
    phone,
    region,
    commission_rate,
    notes,
  });

  if (error) {
    if (error.code === '23505') {
      return fail('A supplier with that email already exists.');
    }
    return fail(error.message);
  }

  revalidatePath('/admin/suppliers');
  redirect('/admin/suppliers?ok=created');
}

export async function updateSupplierStatusAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || '');
  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    redirect('/admin/suppliers?error=Invalid+status');
  }

  const { error } = await supabase
    .from('main_suppliers')
    .update({ status })
    .eq('id', id);

  if (error) {
    redirect('/admin/suppliers?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/suppliers');
  redirect('/admin/suppliers?ok=updated');
}
