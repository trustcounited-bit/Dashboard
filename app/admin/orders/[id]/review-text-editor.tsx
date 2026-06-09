'use client';

import { useState } from 'react';
import { updateReviewTextAction } from '../actions';

type Props = {
  reviewId: string;
  orderId: string;
  currentText: string | null;
  wasEditedBySupplier: boolean;
};

export function ReviewTextEditor({ reviewId, orderId, currentText, wasEditedBySupplier }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentText || '');
  const [submitting, setSubmitting] = useState(false);

  if (!editing) {
    return (
      <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
            Review text
            {wasEditedBySupplier && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Edited by supplier
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] font-medium text-slate-600 hover:text-slate-900"
          >
            {currentText ? 'Edit' : 'Add text'}
          </button>
        </div>
        {currentText ? (
          <div className="whitespace-pre-wrap leading-relaxed">{currentText}</div>
        ) : (
          <div className="italic text-slate-400">No review text assigned yet</div>
        )}
      </div>
    );
  }

  return (
    <form
      action={updateReviewTextAction}
      onSubmit={() => setSubmitting(true)}
      className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
    >
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="hidden" name="order_id" value={orderId} />
      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Editing review text</div>
      <textarea
        name="review_text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs leading-relaxed text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
        autoFocus
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setDraft(currentText || '');
          }}
          className="rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
