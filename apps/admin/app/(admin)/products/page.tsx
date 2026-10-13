'use client';

import Link from 'next/link';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { formatMoney } from '@/lib/api';

export default function ProductsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/products');

  return (
    <div>
      <PageHeader
        title="Products"
        description="Catalog SKUs and variants"
        actions={
          <>
            <button type="button" className="btn btn-sm" onClick={reload}>
              Refresh
            </button>
            <Link href="/bulk" className="btn btn-sm">
              Import
            </Link>
            <Link href="/products/new" className="btn btn-sm btn-gold">
              New product
            </Link>
          </>
        }
      />
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No products yet."
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => (
              <Link href={`/products/${encodeURIComponent(String(row.id ?? ''))}`} className="link-gold">
                {String(row.name ?? row.title ?? row.sku ?? row.id ?? '—')}
              </Link>
            ),
          },
          { key: 'sku', header: 'SKU', get: (row) => row.sku ?? row.slug },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status ?? (row.isActive ? 'ACTIVE' : 'DRAFT')} />,
          },
          {
            key: 'price',
            header: 'Price',
            render: (row) => {
              const variants = row.variants as { price?: number }[] | undefined;
              const price = row.price ?? row.basePrice ?? row.minPrice ?? variants?.[0]?.price;
              return formatMoney(price);
            },
          },
          { key: 'updatedAt', header: 'Updated' },
        ]}
      />
    </div>
  );
}
