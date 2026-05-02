'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSupplier } from '@/lib/auth';

function back(message: string, kind: 'ok' | 'error' = 'error') {
  redirect('/supplier/today?' + kind + '=' + encodeURIComponent(message));
}

/**
 * Supplier self-update completion. RLS scopes the update to their own reviews/reviewers automatically.
 */
export async function supplierRecordCompletionAction(formData: FormData) {
  const user = await requireSupplier();
  const supabase = await createClient();

  const review_id = String(formData.get('review_id') || '');
  const reviewer_id = String(formData.get('reviewer_id') || '');
  const posted_url = String(formData.get('posted_url') || '').trim();
  const postedDateRaw = String(formData.get('posted_date') || '');
  const completion_notes = String(formData.get('completion_notes') || '').trim() || null;
  const force = String(formData.get('force') || '') === '1';

  if (!review_id) return back('Missing review');
  if (!reviewer_id) return back('Pick a reviewer');
  if (!posted_url) return back('Posted URL is required');
  if (!/^https?:\/\//i.test(posted_url)) return back('Posted URL must start with http:// or https://');

  const posted_date = postedDateRaw || new Date().toISOString().slice(0, 10);

  const { data: review, error: reviewErr } = await supabase
    .from('reviews')
    .select('id, client_id, status, main_supplier_id')
    .eq('id', review_id)
    .maybeSingle();
  if (reviewErr || !review) return back('Review not found or not yours');
  if (!['assigned_to_supplier', 'dispatched'].includes(review.status)) {
    return back(`Review status is ${review.status}, can't be posted from here`);
  }

  // Eligibility check
  const { data: result, error: eligErr } = await supabase.rpc('check_reviewer_eligibility', {
    p_reviewer_id: reviewer_id,
    p_client_id: review.client_id,
    p_review_date: posted_date,
  });
  if (eligErr) return back('Eligibility check failed: ' + eligErr.message);

  if (result !== 'ok' && !force) {
    return back(`eligibility:${result}`);
  }

  const { error: updateErr } = await supabase
    .from('reviews')
    .update({
      reviewer_id,
      posted_url,
      posted_date,
      status: 'posted',
      completion_notes,
      completed_by: user.id,
    })
    .eq('id', review_id);
  if (updateErr) return back(updateErr.message);

  revalidatePath('/supplier/today');
  back('Recorded.', 'ok');
}
