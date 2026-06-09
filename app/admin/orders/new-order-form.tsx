'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createOrderAction } from './actions';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { ButtonLink, Button } from '@/components/ui/button';
import { FormField, Input, Select, Textarea } from '@/components/ui/form';

type Client = { id: string; name: string; platform: string };

export function NewOrderForm({ clients }: { clients: Client[] }) {
  const [quantity, setQuantity] = useState<number>(0);
  const [reviewTexts, setReviewTexts] = useState('');

  const parsed = parseReviewTexts(reviewTexts);
  const reviewCount = parsed.length;
  const hasText = reviewTexts.trim().length > 0;
  const countMatches = !hasText || reviewCount === quantity;
  const canSubmit = quantity > 0 && countMatches;

  if (clients.length === 0) {
    return (
      <Card>
        <CardBody>
          <Alert tone="warning" title="Add a client first">
            You need at least one active client before creating an order.{' '}
            <Link href="/admin/clients?form=open" className="underline">Add a client →</Link>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <form action={createOrderAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Client" htmlFor="client_id" required>
              <Select id="client_id" name="client_id" required defaultValue="" autoFocus>
                <option value="" disabled>Choose a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.platform}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Quantity" htmlFor="quantity" required hint="Total reviews to deliver">
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max="10000"
                required
                placeholder="e.g. 5"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              />
            </FormField>

            <FormField label="Cadence (days between reviews)" htmlFor="cadence_days" required hint="3 days is the default">
              <Input id="cadence_days" name="cadence_days" type="number" min="1" max="30" defaultValue="3" required />
            </FormField>

            <FormField label="Start date" htmlFor="start_date" hint="Defaults to today">
              <Input id="start_date" name="start_date" type="date" />
            </FormField>

            <FormField label="Customer name" htmlFor="customer_name">
              <Input id="customer_name" name="customer_name" />
            </FormField>

            <FormField label="Customer email" htmlFor="customer_email">
              <Input id="customer_email" name="customer_email" type="email" />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={2} />
          </FormField>

          <FormField
            label="Review texts"
            htmlFor="review_texts"
            hint={`Paste all ${quantity > 0 ? quantity : 'your'} reviews here, separated by --- on its own line. Leave blank to add later.`}
          >
            <Textarea
              id="review_texts"
              name="review_texts"
              rows={Math.min(Math.max(quantity * 2, 8), 24)}
              value={reviewTexts}
              onChange={(e) => setReviewTexts(e.target.value)}
              placeholder={`Great service, would recommend!\n\n---\n\nFast delivery and quality product.\n\n---\n\nAmazing experience, will buy again.`}
              className="font-mono text-sm"
            />
            {hasText && (
              <div className={
                'mt-1.5 text-xs ' +
                (countMatches ? 'text-emerald-700' : 'text-amber-700')
              }>
                {countMatches ? '✓ ' : ''}{reviewCount} of {quantity || '?'} reviews detected
                {!countMatches && quantity > 0 && reviewCount < quantity && (
                  <> — need {quantity - reviewCount} more</>
                )}
                {!countMatches && quantity > 0 && reviewCount > quantity && (
                  <> — that's {reviewCount - quantity} too many</>
                )}
                {!countMatches && quantity === 0 && (
                  <> — set quantity first</>
                )}
              </div>
            )}
          </FormField>

          <div className="rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <strong>What happens next:</strong> The order generates one review row per quantity, spaced by your cadence.
            If you provided texts above, each one gets randomly assigned to a review row.
            You can also leave texts blank and add them later from the order detail page.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ButtonLink href="/admin/orders" variant="outline">Cancel</ButtonLink>
            <Button type="submit" disabled={!canSubmit}>Create order</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function parseReviewTexts(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw.split(/^---+\s*$/m).map((s) => s.trim()).filter(Boolean);
}
