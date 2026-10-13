'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function DriversPage() {
  const { rows, loading, error, reload } = useApiList('/driver/jobs');

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Driver jobs and assignment status"
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
        emptyMessage="No driver jobs available for this account."
        columns={[
          { key: 'id', header: 'Job ID' },
          {
            key: 'order',
            header: 'Order',
            get: (row) => row.order?.orderNumber ?? row.orderNumber ?? row.orderId,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: 'driver',
            header: 'Driver',
            get: (row) => row.driver?.fullName ?? row.driver?.email ?? row.driverId,
          },
          { key: 'updatedAt', header: 'Updated', get: (row) => row.updatedAt ?? row.createdAt },
        ]}
      />
    </div>
  );
}
