'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';
import { ELIGIBILITY_LABELS, formatDate, type ReviewStatus } from '@/lib/utils';
import { supplierRecordCompletionAction } from './actions';

export type SupplierReviewRow = {
  id: string;
  review_code: string;
  status: ReviewStatus;
  scheduled_date: string;
  dispatched_date: string | null;
  client_name: string;
  client_platform: string;
  review_url: string | null;
};

export type MyReviewer = {
  id: string;
  name: string;
  identifier: string | null;
  posted_count: number;
  lifetime_capacity: number;
  is_at_cap: boolean;
};

export function SupplierTodayList({
  rows,
  reviewers,
  eligibilityFor,
  eligibilityWarning,
}: {
  rows: SupplierReviewRow[];
  reviewers: MyReviewer[];
  eligibilityFor: string | null;
  eligibilityWarning: string | null;
}) {
  // Auto-expand the row whose form just had an eligibility error
  const [expandedId, setExpandedId] = useState<string | null>(eligibilityFor);

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
        const showWarning = eligibilityFor === r.id && eligibilityWarning;
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
              </div>
              <span className="shrink-0 text-xs text-slate-400">{isExpanded ? 'Hide' : 'Update'}</span>
            </button>

            {isExpanded && (
              <CardBody className="border-t border-slate-100 bg-slate-50/50">
                {showWarning && (
                  <Alert tone="warning" className="mb-3" title="Eligibility check failed">
                    {ELIGIBILITY_LABELS[eligibilityWarning!] || eligibilityWarning}
                  </Alert>
                )}
                <form action={supplierRecordCompletionAction} className="space-y-3">
                  <input type="hidden" name="review_id" value={r.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Reviewer" htmlFor={`reviewer_${r.id}`} required>
                      <Select id={`reviewer_${r.id}`} name="reviewer_id" required defaultValue="">
                        <option value="" disabled>Choose reviewer…</option>
                        {reviewers.map((rv) => (
                          <option key={rv.id} value={rv.id} disabled={rv.is_at_cap}>
                            {rv.name}
                            {rv.identifier ? ` (${rv.identifier})` : ''}
                            {' · '}
                            {rv.posted_count}/{rv.lifetime_capacity}
                            {rv.is_at_cap ? ' · AT CAP' : ''}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Posted date" htmlFor={`date_${r.id}`} required>
                      <Input
                        id={`date_${r.id}`}
                        name="posted_date"
                        type="date"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        required
                      />
                    </FormField>
                  </div>
                  <FormField label="Posted URL" htmlFor={`url_${r.id}`} required>
                    <Input id={`url_${r.id}`} name="posted_url" type="url" required placeholder="https://..." />
                  </FormField>
                  <FormField label="Notes" htmlFor={`notes_${r.id}`}>
                    <Textarea id={`notes_${r.id}`} name="completion_notes" rows={2} />
                  </FormField>
                  <div className="flex justify-end gap-2">
                    {showWarning ? (
                      <>
                        <Button type="submit" variant="outline">Re-check</Button>
                        <input type="hidden" name="force" value="1" />
                        <Button type="submit" variant="danger">Save anyway</Button>
                      </>
                    ) : (
                      <Button type="submit">Mark posted</Button>
                    )}
                  </div>
                </form>
              </CardBody>
            )}
          </Card>
        );
      })}
    </div>
  );
}
