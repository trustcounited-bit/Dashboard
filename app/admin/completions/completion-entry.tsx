'use client';

import { useMemo, useState } from 'react';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';
import { StatusBadge } from '@/components/ui/badge';
import { ELIGIBILITY_LABELS, formatDate } from '@/lib/utils';
import type { ReviewStatus } from '@/lib/utils';
import { recordCompletionAction } from './actions';

export type PendingReview = {
  id: string;
  review_code: string;
  status: ReviewStatus;
  client_id: string;
  client_name: string;
  client_platform: string;
  main_supplier_id: string | null;
  main_supplier_name: string | null;
  scheduled_date: string;
  dispatched_date: string | null;
};

export type ReviewerOption = {
  id: string;
  name: string;
  identifier: string | null;
  main_supplier_id: string;
  is_at_cap: boolean;
  posted_count: number;
  lifetime_capacity: number;
};

export function CompletionEntry({
  reviews,
  reviewers,
  eligibilityWarning,
}: {
  reviews: PendingReview[];
  reviewers: ReviewerOption[];
  eligibilityWarning?: string;
}) {
  const [reviewId, setReviewId] = useState<string>('');
  const [reviewerId, setReviewerId] = useState<string>('');
  const [postedUrl, setPostedUrl] = useState<string>('');
  const [postedDate, setPostedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>('');

  const selectedReview = reviews.find((r) => r.id === reviewId);

  // Reviewer options scoped to the selected review's supplier (if assigned)
  // If the review isn't yet assigned, show all reviewers.
  const reviewerChoices = useMemo(() => {
    if (!selectedReview) return [];
    if (!selectedReview.main_supplier_id) return reviewers;
    return reviewers.filter(
      (r) => r.main_supplier_id === selectedReview.main_supplier_id
    );
  }, [reviewers, selectedReview]);

  // Reset reviewer if the chosen one isn't in the new list
  if (reviewerId && !reviewerChoices.find((r) => r.id === reviewerId)) {
    setTimeout(() => setReviewerId(''), 0);
  }

  // Local cap warning (reviewer near or at cap) - shown live before submit
  const selectedReviewer = reviewers.find((r) => r.id === reviewerId);
  const localWarning =
    selectedReviewer && selectedReviewer.is_at_cap
      ? `This reviewer is at lifetime cap (${selectedReviewer.posted_count}/${selectedReviewer.lifetime_capacity})`
      : null;

  const showForceOption = !!eligibilityWarning && eligibilityWarning !== 'reviewer_not_found';
  const eligibilityLabel = eligibilityWarning
    ? ELIGIBILITY_LABELS[eligibilityWarning] || eligibilityWarning
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <form action={recordCompletionAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Review code" htmlFor="review_id" required hint="Pick the review the supplier reported back">
                <Select
                  id="review_id"
                  name="review_id"
                  required
                  value={reviewId}
                  onChange={(e) => setReviewId(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a review code…
                  </option>
                  {reviews.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.review_code} · {r.client_name}
                      {r.main_supplier_name ? ` · ${r.main_supplier_name}` : ''}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Reviewer" htmlFor="reviewer_id" required>
                <Select
                  id="reviewer_id"
                  name="reviewer_id"
                  required
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  defaultValue=""
                  disabled={!reviewId}
                >
                  <option value="" disabled>
                    {reviewId ? 'Choose reviewer…' : 'Pick a review first'}
                  </option>
                  {reviewerChoices.map((r) => (
                    <option key={r.id} value={r.id} disabled={r.is_at_cap}>
                      {r.name}
                      {r.identifier ? ` (${r.identifier})` : ''}
                      {' · '}
                      {r.posted_count}/{r.lifetime_capacity}
                      {r.is_at_cap ? ' · AT CAP' : ''}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            {selectedReview && (
              <div className="rounded-md bg-slate-50 px-4 py-3 text-xs">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                  <span>
                    <span className="font-medium text-slate-500">Client:</span>{' '}
                    <span className="font-medium text-slate-900">{selectedReview.client_name}</span>{' '}
                    <span className="text-slate-500">({selectedReview.client_platform})</span>
                  </span>
                  <span>
                    <span className="font-medium text-slate-500">Supplier:</span>{' '}
                    {selectedReview.main_supplier_name || <em>not assigned</em>}
                  </span>
                  <span>
                    <span className="font-medium text-slate-500">Scheduled:</span>{' '}
                    {formatDate(selectedReview.scheduled_date)}
                  </span>
                  {selectedReview.dispatched_date && (
                    <span>
                      <span className="font-medium text-slate-500">Dispatched:</span>{' '}
                      {formatDate(selectedReview.dispatched_date)}
                    </span>
                  )}
                  <StatusBadge status={selectedReview.status} />
                </div>
              </div>
            )}

            {localWarning && (
              <Alert tone="warning">{localWarning}</Alert>
            )}

            {eligibilityWarning && (
              <Alert tone="warning" title="Eligibility check failed">
                {eligibilityLabel}.{' '}
                {showForceOption && (
                  <span>
                    Review carefully — saving anyway will create an audit trail you can&rsquo;t undo.
                  </span>
                )}
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Posted URL" htmlFor="posted_url" required hint="The live URL of the review after it was posted">
                <Input
                  id="posted_url"
                  name="posted_url"
                  type="url"
                  required
                  value={postedUrl}
                  onChange={(e) => setPostedUrl(e.target.value)}
                  placeholder="https://..."
                />
              </FormField>
              <FormField label="Posted date" htmlFor="posted_date" required>
                <Input
                  id="posted_date"
                  name="posted_date"
                  type="date"
                  required
                  value={postedDate}
                  onChange={(e) => setPostedDate(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Notes" htmlFor="completion_notes">
              <Textarea
                id="completion_notes"
                name="completion_notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2">
              {showForceOption ? (
                <>
                  <Button type="submit" variant="outline">
                    Re-check
                  </Button>
                  <input type="hidden" name="force" value="1" />
                  <Button type="submit" variant="danger">
                    Save anyway
                  </Button>
                </>
              ) : (
                <Button type="submit">Record completion</Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
