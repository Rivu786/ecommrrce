'use client';

import { useState } from 'react';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

export default function ReturnsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/returns');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    setActionError(null);
    try {
      await api(`/admin/returns/${id}/${action}`, { method: 'POST', body: '{}' });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to ${action} return`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Returns"
        description="RMA requests awaiting review"
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
        emptyMessage="No return requests."
        columns={[
          { key: 'id', header: 'Return ID' },
          {
            key: 'order',
            header: 'Order',
            get: (row) => row.order?.orderNumber ?? row.orderNumber ?? row.orderId,
          },
          { key: 'reason', header: 'Reason' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
          },
          { key: 'createdAt', header: 'Created' },
          {
            key: 'actions',
            header: 'Actions',
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
