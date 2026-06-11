'use client';

import { useState } from 'react';
import { Card, CardBody } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FormField, Input, Textarea } from '@/components/ui/form';
import { ELIGIBILITY_LABELS, formatDate, type ReviewStatus } from '@/lib/utils';
import { supplierRecordCompletionAction, supplierUpdateReviewTextAction } from './actions';

export type SupplierReviewRow = {
  id: string;
  review_code: string;
  status: ReviewStatus;
  scheduled_date: string;
  dispatched_date: string | null;
  client_name: string;
  client_platform: string;
  review_url: string | null;
  review_text: string | null;
  review_text_edited_by_supplier: boolean;
};

export type ReviewerHint = {
  id: string;
  name: string;
  posted_count: number;
  lifetime_capacity: number;
  is_at_cap: boolean;
};

export function SupplierTodayList({
  rows,
  reviewerHints,
  eligibilityWarning,
}: {
  rows: SupplierReviewRow[];
  reviewerHints: ReviewerHint[];
  eligibilityWarning: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="py-6 text-center text-sm text-slate-500">
            Nothing assigned right now. Check back later.
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const isExpanded = expandedId === r.id;
        return (
          <Card key={r.id}>
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-900">{r.review_code}</span>
                  <StatusBadge status={r.status} />
                  <Badge tone="slate">{r.client_name}</Badge>
                  <span className="text-xs text-slate-500">{r.client_platform}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Scheduled {formatDate(r.scheduled_date)}
                  {r.dispatched_date && <> · Dispatched {formatDate(r.dispatched_date)}</>}
                </div>
                {r.review_url && (
                  <a
                    href={r.review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-block truncate text-xs text-slate-700 underline-offset-2 hover:underline"
                  >
                    Open review page ↗
                  </a>
                )}
                {r.review_text && (
                  <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <div className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                      Review text to send
                      {r.review_text_edited_by_supplier && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          You edited this
                        </span>
                      )}
                    </div>
                    <div className="line-clamp-3 whitespace-pre-wrap leading-relaxed">{r.review_text}</div>
                  </div>
                )}
              </div>
              <span className="shrink-0 text-xs text-slate-400">{isExpanded ? 'Hide' : 'Update'}</span>
            </button>

            {isExpanded && (
              <CardBody className="space-y-4 border-t border-slate-100 bg-slate-50/50">
                {/* Review text editor */}
                <ReviewTextSection
                  reviewId={r.id}
                  currentText={r.review_text}
                  wasEditedByYou={r.review_text_edited_by_supplier}
                />

                {/* Completion form */}
                <CompletionForm
                  reviewId={r.id}
                  reviewerHints={reviewerHints}
                  eligibilityWarning={eligibilityWarning}
                />
              </CardBody>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ReviewTextSection({
  reviewId,
  currentText,
  wasEditedByYou,
}: {
  reviewId: string;
  currentText: string | null;
  wasEditedByYou: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentText || '');

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Review text
          {wasEditedByYou && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              You edited this
            </span>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(currentText || '');
              setEditing(true);
            }}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            {currentText ? 'Edit text' : 'Add text'}
          </button>
        )}
        {currentText && !editing && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(currentText)}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
            title="Copy to clipboard"
          >
            Copy
          </button>
        )}
      </div>

      {!editing ? (
        currentText ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{currentText}</div>
        ) : (
          <div className="text-sm italic text-slate-400">No review text assigned</div>
        )
      ) : (
        <form action={supplierUpdateReviewTextAction} className="space-y-2">
          <input type="hidden" name="review_id" value={reviewId} />
          <Textarea
            name="review_text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Save text
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function CompletionForm({
  reviewId,
  reviewerHints,
  eligibilityWarning,
}: {
  reviewId: string;
  reviewerHints: ReviewerHint[];
  eligibilityWarning: string | null;
}) {
  const [reviewerName, setReviewerName] = useState('');

  const normalized = reviewerName.trim().toLowerCase();
  const match = normalized
    ? reviewerHints.find((rv) => rv.name.trim().toLowerCase() === normalized)
    : null;

  const showWarning = !!eligibilityWarning;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        Mark posted
      </div>

      {showWarning && (
        <Alert tone="warning" className="mb-3" title="Eligibility check failed">
          {ELIGIBILITY_LABELS[eligibilityWarning!] || eligibilityWarning}
        </Alert>
      )}

      <form action={supplierRecordCompletionAction} className="space-y-3">
        <input type="hidden" name="review_id" value={reviewId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label="Reviewer name"
            htmlFor={`reviewer_${reviewId}`}
            required
            hint={
              match
                ? `Match: ${match.posted_count}/${match.lifetime_capacity} reviews used${match.is_at_cap ? ' · AT CAP' : ''}`
                : reviewerName.trim()
                ? 'New reviewer — will be added to your pool'
                : 'Type the reviewer\'s name (autocomplete shows existing names)'
            }
          >
            <Input
              id={`reviewer_${reviewId}`}
              name="reviewer_name"
              required
              autoComplete="off"
              list={`reviewers_${reviewId}`}
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="e.g. Amit Kumar"
            />
            <datalist id={`reviewers_${reviewId}`}>
              {reviewerHints.map((rv) => (
                <option key={rv.id} value={rv.name}>
                  {rv.posted_count}/{rv.lifetime_capacity}
                  {rv.is_at_cap ? ' · AT CAP' : ''}
                </option>
              ))}
            </datalist>
          </FormField>

          <FormField label="Posted date" htmlFor={`date_${reviewId}`} required>
            <Input
              id={`date_${reviewId}`}
              name="posted_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </FormField>
        </div>

        <FormField label="Posted URL" htmlFor={`url_${reviewId}`} required>
          <Input id={`url_${reviewId}`} name="posted_url" type="url" required placeholder="https://..." />
        </FormField>

        <FormField label="Notes" htmlFor={`notes_${reviewId}`}>
          <Textarea id={`notes_${reviewId}`} name="completion_notes" rows={2} />
        </FormField>

        <div className="flex justify-end gap-2">
          {showWarning ? (
            <>
              <Button type="submit" variant="outline">Re-check</Button>
              <input type="hidden" name="force" value="1" />
              <Button type="submit" variant="danger">Save anyway</Button>
            </>
          ) : (
            <Button type="submit" disabled={!reviewerName.trim()}>Mark posted</Button>
          )}
        </div>
      </form>
    </div>
  );
}
