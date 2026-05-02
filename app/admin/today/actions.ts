'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdminOrExec } from '@/lib/auth';

function back(message: string, kind: 'ok' | 'error' = 'error') {
  redirect('/admin/today?' + kind + '=' + encodeURIComponent(message));
}

/**
 * Assign one or more reviews to a Main Supplier.
 * Sets status to 'assigned_to_supplier' and stamps main_supplier_id.
 */
export async function assignReviewsAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const supplier_id = String(formData.get('supplier_id') || '');
  const review_ids = formData.getAll('review_ids').map((v) => String(v));

  if (!supplier_id) return back('Pick a supplier to assign these to');
  if (review_ids.length === 0) return back('Select at least one review to assign');

  const { error } = await supabase
    .from('reviews')
    .update({
      main_supplier_id: supplier_id,
      status: 'assigned_to_supplier',
    })
    .in('id', review_ids)
    .in('status', ['unassigned', 'assigned_to_supplier']); // safety: don't touch posted/dropped

  if (error) return back(error.message);

  revalidatePath('/admin/today');
  back(`${review_ids.length} review${review_ids.length === 1 ? '' : 's'} assigned`, 'ok');
}

/**
 * Mark one or more reviews as dispatched (sent to the supplier today).
 * Use this after sending the WhatsApp message — it records the dispatch and starts the clock.
 */
export async function markDispatchedAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const review_ids = formData.getAll('review_ids').map((v) => String(v));
  if (review_ids.length === 0) return back('No reviews selected to mark dispatched');

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from('reviews')
    .update({
      status: 'dispatched',
      dispatched_date: today,
    })
    .in('id', review_ids)
    .eq('status', 'assigned_to_supplier'); // only assigned reviews can be dispatched

  if (error) return back(error.message);

  revalidatePath('/admin/today');
  back(`${review_ids.length} review${review_ids.length === 1 ? '' : 's'} marked dispatched`, 'ok');
}
