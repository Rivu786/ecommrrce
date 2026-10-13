'use client';

import { useState } from 'react';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

export default function ReviewsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/reviews/pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    setActionError(null);
    try {
      await api(`/admin/reviews/${id}/${action}`, { method: 'POST' });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to ${action} review`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Moderate pending product reviews"
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />
      {actionError ? (
        <div className="state-box error" style={{ marginBottom: 12 }}>
          {actionError}
        </div>
      ) : null}
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No reviews awaiting moderation."
        columns={[
          { key: 'id', header: 'Review' },
          {
            key: 'product',
            header: 'Product',
            get: (row) => row.product?.name ?? row.productId,
          },
          { key: 'rating', header: 'Rating' },
          { key: 'body', header: 'Comment', get: (row) => row.body ?? row.comment ?? row.content },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status ?? 'PENDING'} />,
          },
          {
            key: 'actions',
            header: 'Moderate',
            render: (row) => {
              const id = String(row.id ?? '');
              const busy = busyId === id;
              return (
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-sm btn-gold"
                    disabled={!id || busy}
                    onClick={() => act(id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={!id || busy}
                    onClick={() => act(id, 'reject')}
                  >
                    Reject
                  </button>
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}
