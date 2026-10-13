'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function PromotionsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/marketing/coupons');

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Coupons and campaign codes"
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
        emptyMessage="No promotions configured."
        columns={[
          { key: 'code', header: 'Code' },
          { key: 'name', header: 'Name', get: (row) => row.name ?? row.description },
          {
            key: 'type',
            header: 'Type',
            get: (row) => row.type ?? row.discountType,
          },
          {
            key: 'value',
            header: 'Value',
            get: (row) => row.value ?? row.amount ?? row.percent,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusBadge status={row.isActive === false ? 'INACTIVE' : row.status ?? 'ACTIVE'} />
            ),
          },
          { key: 'expiresAt', header: 'Expires', get: (row) => row.expiresAt ?? row.validTo },
        ]}
      />
    </div>
  );
}
