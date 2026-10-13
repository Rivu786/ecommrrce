'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function CompaniesPage() {
  const { rows, loading, error, reload } = useApiList('/admin/b2b/companies');

  return (
    <div>
      <PageHeader
        title="Companies"
        description="B2B company accounts"
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
        emptyMessage="No companies found."
        columns={[
          { key: 'name', header: 'Company' },
          { key: 'gstin', header: 'GSTIN', get: (row) => row.gstin ?? row.taxId },
          { key: 'email', header: 'Email', get: (row) => row.email ?? row.billingEmail },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusBadge status={row.isActive === false ? 'INACTIVE' : row.status ?? 'ACTIVE'} />
            ),
          },
          { key: 'createdAt', header: 'Created' },
        ]}
      />
    </div>
  );
}
