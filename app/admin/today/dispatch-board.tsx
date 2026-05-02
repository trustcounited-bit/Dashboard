'use client';

import { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Select } from '@/components/ui/form';
import { formatDate, type ReviewStatus } from '@/lib/utils';
import { assignReviewsAction, markDispatchedAction } from './actions';

export type DispatchRow = {
  id: string;
  review_code: string;
  scheduled_date: string;
  status: ReviewStatus;
  client_name: string;
  client_platform: string;
  review_url: string | null;
  main_supplier_id: string | null;
  main_supplier_name: string | null;
  is_overdue: boolean;
};

export type SupplierOption = { id: string; name: string };

export function DispatchBoard({
  rows,
  suppliers,
  today,
}: {
  rows: DispatchRow[];
  suppliers: SupplierOption[];
  today: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allChecked = selected.size > 0 && selected.size === allIds.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allIds));
  }

  // Build the WhatsApp message preview from currently selected rows
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const supplierName = suppliers.find((s) => s.id === supplierId)?.name || '';
  const waMessage = useMemo(() => {
    if (selectedRows.length === 0) return '';
    const dateStr = new Date(today).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const lines: string[] = [];
    lines.push(`Hi${supplierName ? ' ' + supplierName : ''},`);
    lines.push('');
    lines.push(`Today's review tasks (${dateStr}) — ${selectedRows.length} total:`);
    lines.push('');
    selectedRows.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.client_name} (${r.client_platform})`);
      lines.push(`   Code: ${r.review_code}`);
      if (r.review_url) lines.push(`   Link: ${r.review_url}`);
      lines.push('');
    });
    lines.push('Once your reviewers post, please reply with:');
    lines.push('• The code of each review');
    lines.push('• The reviewer name/identifier');
    lines.push('• The live URL of the posted review');
    lines.push('');
    lines.push('Thanks!');
    return lines.join('\n');
  }, [selectedRows, supplierName, today]);

  // Categorize for display
  const overdue = rows.filter((r) => r.is_overdue);
  const dueToday = rows.filter((r) => !r.is_overdue);

  return (
    <div className="space-y-6">
      {/* Action bar - sticky on mobile */}
      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {selected.size === 0 ? (
              <span className="text-slate-500">Select reviews to assign or dispatch.</span>
            ) : (
              <span className="font-medium text-slate-900">
                {selected.size} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-44"
              disabled={suppliers.length === 0}
            >
              {suppliers.length === 0 ? (
                <option>No active suppliers</option>
              ) : (
                suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </Select>
            <form action={assignReviewsAction}>
              <input type="hidden" name="supplier_id" value={supplierId} />
              {Array.from(selected).map((id) => (
                <input key={id} type="hidden" name="review_ids" value={id} />
              ))}
              <Button
                type="submit"
                variant="outline"
                disabled={selected.size === 0 || !supplierId}
              >
                Assign to supplier
              </Button>
            </form>
            <form action={markDispatchedAction}>
              {Array.from(selected).map((id) => (
                <input key={id} type="hidden" name="review_ids" value={id} />
              ))}
              <Button
                type="submit"
                disabled={selected.size === 0}
                title="Mark as sent — only works on already-assigned reviews"
              >
                Mark dispatched
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>

      {/* WhatsApp preview */}
      {selected.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>WhatsApp message preview</CardTitle>
              <CopyButton value={waMessage} label="Copy message" copiedLabel="Message copied" size="md" />
            </div>
          </CardHeader>
          <CardBody>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
              {waMessage}
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              Copy this and paste into WhatsApp to send the day&rsquo;s task list.
              When the supplier confirms receipt, click <strong>Mark dispatched</strong> above.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <Card className="border-rose-200">
          <CardHeader className="border-rose-100 bg-rose-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-rose-900">
                Overdue · {overdue.length}
              </CardTitle>
            </div>
          </CardHeader>
          <DispatchTable
            rows={overdue}
            selected={selected}
            onToggle={toggle}
            onToggleAll={() => {
              const ids = overdue.map((r) => r.id);
              const allOverdueSelected = ids.every((id) => selected.has(id));
              setSelected((prev) => {
                const next = new Set(prev);
                if (allOverdueSelected) ids.forEach((id) => next.delete(id));
                else ids.forEach((id) => next.add(id));
                return next;
              });
            }}
          />
        </Card>
      )}

      {/* Due today */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Due today · {dueToday.length}</CardTitle>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              Select all
            </label>
          </div>
        </CardHeader>
        {dueToday.length === 0 ? (
          <CardBody>
            <div className="py-6 text-center text-sm text-slate-500">
              No reviews scheduled for today.
            </div>
          </CardBody>
        ) : (
          <DispatchTable
            rows={dueToday}
            selected={selected}
            onToggle={toggle}
          />
        )}
      </Card>
    </div>
  );
}

function DispatchTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
}: {
  rows: DispatchRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll?: () => void;
}) {
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = rows.some((r) => selected.has(r.id)) && !allChecked;

  return (
    <div className="divide-y divide-slate-100">
      <div className="hidden grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
        <div className="col-span-1">
          {onToggleAll && (
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked;
              }}
              onChange={onToggleAll}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
          )}
        </div>
        <div className="col-span-2">Code</div>
        <div className="col-span-3">Client</div>
        <div className="col-span-2">Scheduled</div>
        <div className="col-span-2">Supplier</div>
        <div className="col-span-2 text-right">Status</div>
      </div>
      {rows.map((r) => {
        const isSelected = selected.has(r.id);
        return (
          <label
            key={r.id}
            className={
              'grid cursor-pointer grid-cols-1 gap-2 px-5 py-3 text-sm transition sm:grid-cols-12 sm:items-center sm:gap-4 ' +
              (isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60')
            }
          >
            <div className="sm:col-span-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(r.id)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
            </div>
            <div className="font-mono text-xs sm:col-span-2">{r.review_code}</div>
            <div className="sm:col-span-3">
              <div className="font-medium text-slate-900">{r.client_name}</div>
              <div className="text-xs text-slate-500">{r.client_platform}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-slate-600">{formatDate(r.scheduled_date)}</div>
              {r.is_overdue && <div className="text-xs font-medium text-rose-600">Overdue</div>}
            </div>
            <div className="sm:col-span-2">
              {r.main_supplier_name ? (
                <Badge tone="blue">{r.main_supplier_name}</Badge>
              ) : (
                <span className="text-xs text-slate-400">Not yet</span>
              )}
            </div>
            <div className="sm:col-span-2 sm:text-right">
              <StatusBadge status={r.status} />
            </div>
          </label>
        );
      })}
    </div>
  );
}
