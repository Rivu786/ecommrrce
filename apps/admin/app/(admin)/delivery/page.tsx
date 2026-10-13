'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function DeliveryPage() {
  const { rows, loading, error, reload } = useApiList('/admin/orders');

  const deliveryRows = rows.filter((row) => {
    const status = String(row.status ?? '').toUpperCase();
    return ['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'READY'].some((s) =>
      status.includes(s),
    );
  });

  return (
    <div>
      <PageHeader
        title="Delivery"
        description="Orders in fulfillment / delivery pipeline. Set delivery commission % and radius on Settings."
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />
      <DataTable
        loading={loading}
        error={error}
        rows={deliveryRows.length ? deliveryRows : rows}
        emptyMessage="No delivery jobs found."
        columns={[
          { key: 'orderNumber', header: 'Order #' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: 'shippingAddress',
            header: 'Destination',
            get: (row) =>
              row.shippingAddress?.city ??
              row.shippingCity ??
              row.deliveryAddress ??
              row.customer?.email,
          },
          { key: 'updatedAt', header: 'Updated', get: (row) => row.updatedAt ?? row.createdAt },
        ]}
      />
    </div>
  );
}
