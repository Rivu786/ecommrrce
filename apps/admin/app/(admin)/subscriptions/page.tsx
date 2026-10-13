'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { formatMoney } from '@/lib/api';

export default function SubscriptionsPage() {
  const { rows, loading, error, reload } = useApiList('/subscription-plans');

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Subscription plans available to customers"
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
        emptyMessage="No subscription plans."
        columns={[
          { key: 'name', header: 'Plan' },
          { key: 'interval', header: 'Interval', get: (row) => row.interval ?? row.billingInterval },
          {
            key: 'price',
            header: 'Price',
            render: (row) => formatMoney(row.price ?? row.amount),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusBadge status={row.isActive === false ? 'INACTIVE' : row.status ?? 'ACTIVE'} />
            ),
          },
          { key: 'updatedAt', header: 'Updated', get: (row) => row.updatedAt ?? row.createdAt },
        ]}
      />
    </div>
  );
}
