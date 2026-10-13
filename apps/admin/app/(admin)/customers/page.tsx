'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function CustomersPage() {
  const { rows, loading, error, reload } = useApiList('/admin/customers');

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer accounts for this tenant"
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
        emptyMessage="No customers found."
        columns={[
          { key: 'fullName', header: 'Name', get: (row) => row.fullName ?? row.name },
          { key: 'email', header: 'Email' },
          { key: 'phone', header: 'Phone' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusBadge status={row.isActive === false ? 'INACTIVE' : row.status ?? 'ACTIVE'} />
            ),
          },
          { key: 'createdAt', header: 'Joined' },
        ]}
      />
    </div>
  );
}
