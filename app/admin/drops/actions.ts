'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdminOrExec } from '@/lib/auth';

function back(message: string, kind: 'ok' | 'error' = 'error') {
  redirect('/admin/drops?' + kind + '=' + encodeURIComponent(message));
}

/**
 * Mark a review as still live after a drop check.
 * Sets status back to 'posted' (in case it was 'due_for_check'), updates last_checked_date,
 * and writes an entry to drop_check_log.
 */
export async function markLiveAction(formData: FormData) {
  const user = await requireAdminOrExec();
  const supabase = await createClient();

  const review_id = String(formData.get('review_id') || '');
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!review_id) return back('Missing review');

  const today = new Date().toISOString().slice(0, 10);

  // Update the review
  const { error: updateErr } = await supabase
    .from('reviews')
    .update({
      status: 'posted',
      last_checked_date: today,
    })
    .eq('id', review_id);
  if (updateErr) return back(updateErr.message);

  // Log the check
  const { error: logErr } = await supabase.from('drop_check_log').insert({
    review_id,
    checked_by: user.id,
    result: 'live',
    notes,
  });
  if (logErr) return back('Updated, but log failed: ' + logErr.message);

  revalidatePath('/admin/drops');
  back('Marked live and logged.', 'ok');
}

/**
 * Mark a review as dropped. The DB trigger create_replacement_review will auto-create
 * a replacement task when status flips to 'dropped'.
 */
export async function markDroppedAction(formData: FormData) {
  const user = await requireAdminOrExec();
  const supabase = await createClient();

  const review_id = String(formData.get('review_id') || '');
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!review_id) return back('Missing review');

  const today = new Date().toISOString().slice(0, 10);

  const { error: updateErr } = await supabase
    .from('reviews')
    .update({
      status: 'dropped',
      last_checked_date: today,
    })
    .eq('id', review_id);
  if (updateErr) return back(updateErr.message);

  const { error: logErr } = await supabase.from('drop_check_log').insert({
    review_id,
    checked_by: user.id,
    result: 'dropped',
    notes,
  });
  if (logErr) return back('Updated, but log failed: ' + logErr.message);

  revalidatePath('/admin/drops');
  back('Marked dropped — a replacement task was queued automatically.', 'ok');
}

/**
 * Bulk mark reviews as 'due_for_check' so they show up in the check queue.
 * Useful for manually queueing older reviews. (The DB might also do this on schedule
 * via a separate job — this is a manual escape hatch.)
 */
export async function queueForCheckAction(formData: FormData) {
  await requireAdminOrExec();
  const supabase = await createClient();

  const review_ids = formData.getAll('review_ids').map((v) => String(v));
  if (review_ids.length === 0) return back('No reviews selected');

  const { error } = await supabase
    .from('reviews')
    .update({ status: 'due_for_check' })
    .in('id', review_ids)
    .eq('status', 'posted');

  if (error) return back(error.message);
  revalidatePath('/admin/drops');
  back(`${review_ids.length} review${review_ids.length === 1 ? '' : 's'} queued for check.`, 'ok');
}
