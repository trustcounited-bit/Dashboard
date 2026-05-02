import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarIcon } from '@/components/icons';
import { DispatchBoard, type DispatchRow, type SupplierOption } from './dispatch-board';
import type { ReviewStatus } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Reviews due today or overdue, not yet posted/dropped
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, review_code, scheduled_date, status, client_id, main_supplier_id')
    .lte('scheduled_date', today)
    .in('status', ['unassigned', 'assigned_to_supplier'])
    .order('scheduled_date', { ascending: true });

  // Active suppliers for the assignment dropdown
  const { data: suppliers } = await supabase
    .from('main_suppliers')
    .select('id, name')
    .eq('status', 'active')
    .order('name');

  // Build lookup tables for client and supplier names
  const clientIds = Array.from(new Set((reviews || []).map((r) => r.client_id).filter(Boolean) as string[]));
  const { data: clients } = clientIds.length
    ? await supabase
        .from('clients')
        .select('id, name, platform, review_url')
        .in('id', clientIds)
    : { data: [] };
  const clientMap = new Map((clients || []).map((c) => [c.id, c]));

  const supplierIdsInUse = Array.from(new Set((reviews || []).map((r) => r.main_supplier_id).filter(Boolean) as string[]));
  const supplierLookup = new Map<string, string>();
  (suppliers || []).forEach((s) => supplierLookup.set(s.id, s.name));
  if (supplierIdsInUse.length > 0) {
    const missingIds = supplierIdsInUse.filter((id) => !supplierLookup.has(id));
    if (missingIds.length > 0) {
      const { data: extra } = await supabase
        .from('main_suppliers')
        .select('id, name')
        .in('id', missingIds);
      (extra || []).forEach((s) => supplierLookup.set(s.id, s.name));
    }
  }

  const rows: DispatchRow[] = (reviews || []).map((r) => {
    const client = clientMap.get(r.client_id);
    return {
      id: r.id,
      review_code: r.review_code || '',
      scheduled_date: r.scheduled_date,
      status: r.status as ReviewStatus,
      client_name: client?.name || '—',
      client_platform: client?.platform || '',
      review_url: client?.review_url || null,
      main_supplier_id: r.main_supplier_id,
      main_supplier_name: r.main_supplier_id ? supplierLookup.get(r.main_supplier_id) || null : null,
      is_overdue: r.scheduled_date < today,
    };
  });

  const supplierOptions: SupplierOption[] = (suppliers || []).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's dispatch"
        description="Reviews due today or overdue. Select reviews, assign to a supplier, copy the WhatsApp message, then mark dispatched once sent."
      />

      {params.ok && <Alert tone="success">{params.ok}</Alert>}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={22} />}
          title="Nothing due today"
          description="No reviews are scheduled for today and there are no overdue tasks. Come back tomorrow or create a new order to schedule more reviews."
        />
      ) : supplierOptions.length === 0 ? (
        <Alert tone="warning" title="No active suppliers">
          You need at least one active supplier before you can dispatch reviews. Add one in the Suppliers page.
        </Alert>
      ) : (
        <DispatchBoard rows={rows} suppliers={supplierOptions} today={today} />
      )}
    </div>
  );
}
