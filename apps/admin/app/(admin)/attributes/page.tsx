'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function AttributesPage() {
  const { rows, loading, error, reload } = useApiList('/admin/attributes');

  return (
    <div>
      <PageHeader
        title="Attributes"
        description="Product attributes and option sets"
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
        emptyMessage="No attributes configured."
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'code', header: 'Code', get: (row) => row.code ?? row.slug },
          { key: 'type', header: 'Type', get: (row) => row.type ?? row.inputType },
          {
            key: 'isFilterable',
            header: 'Filterable',
            render: (row) => <StatusBadge status={row.isFilterable ? 'YES' : 'NO'} />,
          },
          { key: 'updatedAt', header: 'Updated' },
        ]}
      />
    </div>
  );
}
