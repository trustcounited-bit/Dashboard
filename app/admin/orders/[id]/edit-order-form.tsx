'use client';

import { useState } from 'react';
import { updateOrderAction } from '../actions';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormField, Input, Textarea } from '@/components/ui/form';

type Order = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  cadence_days: number;
  notes: string | null;
};

export function EditOrderForm({ order, cancelHref }: { order: Order; cancelHref: string }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit order details</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          action={updateOrderAction}
          onSubmit={() => setSubmitting(true)}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={order.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Customer name" htmlFor="customer_name">
              <Input
                id="customer_name"
                name="customer_name"
                defaultValue={order.customer_name || ''}
              />
            </FormField>
            <FormField label="Customer email" htmlFor="customer_email">
              <Input
                id="customer_email"
                name="customer_email"
                type="email"
                defaultValue={order.customer_email || ''}
              />
            </FormField>
            <FormField
              label="Cadence (days)"
              htmlFor="cadence_days"
              hint="Affects future schedule changes only. Existing review dates are not retroactively shifted."
            >
              <Input
                id="cadence_days"
                name="cadence_days"
                type="number"
                min="1"
                max="30"
                defaultValue={order.cadence_days}
              />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={3} defaultValue={order.notes || ''} />
          </FormField>

          <div className="rounded-md bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <strong>Not editable:</strong> client, quantity, and start date are locked because
            the review schedule was generated from them. To change those, delete the order and create a new one.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ButtonLink href={cancelHref} variant="outline">Cancel</ButtonLink>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
