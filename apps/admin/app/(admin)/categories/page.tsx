'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function CategoriesPage() {
  const { rows, loading, error, reload } = useApiList('/admin/categories');

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Category tree and navigation"
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
        emptyMessage="No categories found."
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'slug', header: 'Slug' },
          { key: 'parentId', header: 'Parent', get: (row) => row.parentId ?? row.parent?.name },
          {
            key: 'isActive',
            header: 'Status',
            render: (row) => (
              <StatusBadge status={row.isActive === false ? 'INACTIVE' : row.status ?? 'ACTIVE'} />
            ),
          },
          { key: 'updatedAt', header: 'Updated' },
        ]}
      />
    </div>
  );
}
