'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSupplier } from '@/lib/auth';

function back(message: string, kind: 'ok' | 'error' = 'error') {
  redirect('/supplier/today?' + kind + '=' + encodeURIComponent(message));
}

function normalizeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Supplier marks a review as posted.
 * - Accepts a free-text reviewer name.
 * - Looks up an existing reviewer in their pool by normalized name (case + whitespace insensitive).
 * - If no match, creates a new reviewer record on the fly.
 * - Then runs the standard eligibility check + status update.
 *
 * RLS scopes everything to the current supplier automatically.
 */
export async function supplierRecordCompletionAction(formData: FormData) {
  const user = await requireSupplier();
  const supabase = await createClient();

  const review_id = String(formData.get('review_id') || '');
  const reviewer_name_raw = String(formData.get('reviewer_name') || '').trim();
  const posted_url = String(formData.get('posted_url') || '').trim();
  const postedDateRaw = String(formData.get('posted_date') || '');
  const completion_notes = String(formData.get('completion_notes') || '').trim() || null;
  const force = String(formData.get('force') || '') === '1';

  if (!review_id) return back('Missing review');
  if (!reviewer_name_raw) return back('Reviewer name is required');
  if (!posted_url) return back('Posted URL is required');
  if (!/^https?:\/\//i.test(posted_url)) return back('Posted URL must start with http:// or https://');
  if (!user.main_supplier_id) return back('Your profile is missing a supplier link. Contact admin.');

  const posted_date = postedDateRaw || new Date().toISOString().slice(0, 10);

  // 1. Verify review belongs to this supplier and is in a postable status
  const { data: review, error: reviewErr } = await supabase
    .from('reviews')
    .select('id, client_id, status, main_supplier_id')
    .eq('id', review_id)
    .maybeSingle();
  if (reviewErr || !review) return back('Review not found or not yours');
  if (!['assigned_to_supplier', 'dispatched'].includes(review.status)) {
    return back(`Review status is ${review.status}, can't be posted from here`);
  }

  // 2. Find or create the reviewer.
  // Case- and whitespace-insensitive lookup within this supplier's pool.
  const normalized = normalizeName(reviewer_name_raw);

  // ilike with quote-escaped exact-match (after normalization)
  // We do client-side normalize to keep it portable; just do a broad ilike then filter.
  const { data: candidates } = await supabase
    .from('reviewers')
    .select('id, name, status')
    .ilike('name', reviewer_name_raw);

  let reviewer_id: string | null = null;
  if (candidates && candidates.length > 0) {
    const exact = candidates.find((c) => normalizeName(c.name) === normalized);
    if (exact) reviewer_id = exact.id;
  }

  if (!reviewer_id) {
    // Create a new reviewer record under this supplier
    const { data: created, error: createErr } = await supabase
      .from('reviewers')
      .insert({
        main_supplier_id: user.main_supplier_id,
        name: reviewer_name_raw,
      })
      .select('id')
      .single();
    if (createErr || !created) {
      return back('Could not create new reviewer: ' + (createErr?.message || 'unknown error'));
    }
    reviewer_id = created.id;
  }

  // 3. Eligibility check
  const { data: result, error: eligErr } = await supabase.rpc('check_reviewer_eligibility', {
    p_reviewer_id: reviewer_id,
    p_client_id: review.client_id,
    p_review_date: posted_date,
  });
  if (eligErr) return back('Eligibility check failed: ' + eligErr.message);

  if (result !== 'ok' && !force) {
    return back(`eligibility:${result}`);
  }

  // 4. Update the review row
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

/**
 * Supplier-side review text edit. Sets the edited flag so admin can see who changed it.
 */
export async function supplierUpdateReviewTextAction(formData: FormData) {
  await requireSupplier();
  const supabase = await createClient();

  const review_id = String(formData.get('review_id') || '');
  const review_text = String(formData.get('review_text') || '').trim();

  if (!review_id) return back('Missing review');

  const { error } = await supabase
    .from('reviews')
    .update({
      review_text: review_text || null,
      review_text_edited_by_supplier: true,
    })
    .eq('id', review_id);

  if (error) return back(error.message);

  revalidatePath('/supplier/today');
  back('Review text updated.', 'ok');
}
