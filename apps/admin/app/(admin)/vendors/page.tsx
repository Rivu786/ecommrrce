'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function VendorsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/marketplace/vendors');

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Marketplace seller accounts"
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
        emptyMessage="No vendors found."
        columns={[
          { key: 'name', header: 'Vendor' },
          { key: 'email', header: 'Email', get: (row) => row.email ?? row.contactEmail },
          {
            key: 'kycStatus',
            header: 'KYC',
            render: (row) => <StatusBadge status={row.kycStatus ?? row.status ?? 'PENDING'} />,
          },
          {
            key: 'isActive',
            header: 'Active',
            render: (row) => <StatusBadge status={row.isActive === false ? 'NO' : 'YES'} />,
          },
          { key: 'createdAt', header: 'Created' },
        ]}
      />
    </div>
  );
}
