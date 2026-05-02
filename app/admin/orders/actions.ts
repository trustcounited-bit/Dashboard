'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdminOrExec } from '@/lib/auth';

const STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const;

function fail(message: string) {
  redirect('/admin/orders?form=open&error=' + encodeURIComponent(message));
}

export async function createOrderAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const client_id = String(formData.get('client_id') || '');
  const quantityRaw = String(formData.get('quantity') || '');
  const cadenceRaw = String(formData.get('cadence_days') || '3');
  const start_date = String(formData.get('start_date') || '') || null;
  const customer_name = String(formData.get('customer_name') || '').trim() || null;
  const customer_email = String(formData.get('customer_email') || '').trim() || null;
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!client_id) return fail('Please choose a client');

  const quantity = parseInt(quantityRaw, 10);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 10000) {
    return fail('Quantity must be between 1 and 10,000');
  }

  const cadence_days = parseInt(cadenceRaw, 10);
  if (!Number.isFinite(cadence_days) || cadence_days < 1 || cadence_days > 30) {
    return fail('Cadence must be between 1 and 30 days');
  }

  const insertData: Record<string, unknown> = {
    client_id,
    quantity,
    cadence_days,
    customer_name,
    customer_email,
    notes,
  };
  if (start_date) insertData.start_date = start_date;

  const { data, error } = await supabase
    .from('orders')
    .insert(insertData)
    .select('id')
    .single();

  if (error) return fail(error.message);

  revalidatePath('/admin/orders');
  redirect(`/admin/orders/${data.id}?ok=created`);
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || '');

  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    redirect('/admin/orders?error=Invalid+status');
  }

  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) {
    redirect(`/admin/orders/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?ok=updated`);
}
