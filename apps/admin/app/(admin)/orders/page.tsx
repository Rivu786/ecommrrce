'use client';

import Link from 'next/link';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { formatMoney } from '@/lib/api';

export default function OrdersPage() {
  const { rows, loading, error, reload } = useApiList('/admin/orders');

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Sales orders and fulfillment state"
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No orders yet."
        columns={[
          {
            key: 'orderNumber',
            header: 'Order #',
            render: (row) => (
              <Link href={`/orders/${encodeURIComponent(String(row.id ?? ''))}`} className="link-gold">
                {String(row.orderNumber ?? row.id ?? '—')}
              </Link>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            get: (row) => row.customer?.email ?? row.customerEmail ?? row.user?.email ?? row.customerId,
          },
          {
            key: 'channel',
            header: 'Channel',
            get: (row) => row.channel ?? 'ONLINE',
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: 'grandTotal',
            header: 'Total',
            render: (row) => formatMoney(row.grandTotal ?? row.total),
          },
          { key: 'createdAt', header: 'Created' },
        ]}
      />
    </div>
  );
}
