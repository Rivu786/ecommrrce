'use client';

import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';

export default function ContentPage() {
  const { rows, loading, error, reload } = useApiList('/admin/cms/pages');

  return (
    <div>
      <PageHeader
        title="Content"
        description="CMS pages and storefront content"
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
        emptyMessage="No CMS pages yet."
        columns={[
          { key: 'title', header: 'Title', get: (row) => row.title ?? row.name },
          { key: 'slug', header: 'Slug' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusBadge status={row.isPublished ? 'PUBLISHED' : row.status ?? 'DRAFT'} />
            ),
          },
          { key: 'updatedAt', header: 'Updated' },
        ]}
      />
    </div>
  );
}
