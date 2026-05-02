'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdminOrExec } from '@/lib/auth';

function back(message: string, kind: 'ok' | 'error' = 'error') {
  redirect('/admin/completions?' + kind + '=' + encodeURIComponent(message));
}

/**
 * Record a completion. Inputs:
 *   - review_id (the review being marked posted)
 *   - reviewer_id (the reviewer who did it - from the supplier's pool)
 *   - posted_url
 *   - posted_date (defaults to today)
 *   - completion_notes (optional)
 *   - force (boolean) - bypass eligibility warnings (still blocks hard errors)
 *
 * Calls check_reviewer_eligibility(reviewer_id, client_id, posted_date) first.
 * Returns 'ok' or one of the violation reasons. We surface as a warning unless `force` is set.
 */
export async function recordCompletionAction(formData: FormData) {
  const user = await requireAdminOrExec();
  const supabase = await createClient();

  const review_id = String(formData.get('review_id') || '');
  const reviewer_id = String(formData.get('reviewer_id') || '');
  const posted_url = String(formData.get('posted_url') || '').trim();
  const postedDateRaw = String(formData.get('posted_date') || '');
  const completion_notes = String(formData.get('completion_notes') || '').trim() || null;
  const force = String(formData.get('force') || '') === '1';

  if (!review_id) return back('Missing review');
  if (!reviewer_id) return back('Pick the reviewer who posted this');
  if (!posted_url) return back('Posted URL is required');
  if (!/^https?:\/\//i.test(posted_url)) return back('Posted URL must start with http:// or https://');

  const posted_date = postedDateRaw || new Date().toISOString().slice(0, 10);

  // Find the review's client_id (needed for eligibility check)
  const { data: review, error: reviewErr } = await supabase
    .from('reviews')
    .select('id, client_id, status, main_supplier_id')
    .eq('id', review_id)
    .maybeSingle();

  if (reviewErr || !review) return back('Review not found');

  // Status guard - only assigned/dispatched reviews can be marked posted via this flow
  if (!['assigned_to_supplier', 'dispatched'].includes(review.status)) {
    return back(`This review can't be posted from its current status (${review.status})`);
  }

  // Eligibility check via DB function
  const { data: eligibilityResult, error: eligErr } = await supabase.rpc(
    'check_reviewer_eligibility',
    {
      p_reviewer_id: reviewer_id,
      p_client_id: review.client_id,
      p_review_date: posted_date,
    }
  );

  if (eligErr) return back('Eligibility check failed: ' + eligErr.message);

  if (eligibilityResult !== 'ok' && !force) {
    // Surface the warning back to the form. The UI will offer a "Save anyway" button that re-submits with force=1.
    return back(`eligibility:${eligibilityResult}`);
  }

  // Update the review
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

  revalidatePath('/admin/completions');
  back('Completion recorded.', 'ok');
}
