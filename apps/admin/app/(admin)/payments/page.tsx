'use client';

import { useState } from 'react';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api, formatMoney } from '@/lib/api';

export default function PaymentsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/payments/pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(id: string, action: 'confirm' | 'reject') {
    setBusyId(id);
    setActionError(null);
    try {
      await api(`/admin/payments/${id}/${action}`, {
        method: 'POST',
        body: action === 'reject' ? JSON.stringify({ reason: 'Rejected from admin' }) : undefined,
      });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to ${action} payment`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="UTR / QR verification queue"
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
        emptyMessage="No pending payments."
        columns={[
          { key: 'id', header: 'Payment ID' },
          {
            key: 'order',
            header: 'Order',
            get: (row) => row.order?.orderNumber ?? row.orderNumber ?? row.orderId,
          },
          {
            key: 'amount',
            header: 'Amount',
            render: (row) => formatMoney(row.amount ?? row.grandTotal),
          },
          { key: 'utr', header: 'UTR', get: (row) => row.utr ?? row.reference ?? row.orderPaymentReference },
          { key: 'payerBankName', header: 'Bank', get: (row) => row.payerBankName ?? '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
          },
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
                    onClick={() => act(id, 'confirm')}
                  >
                    Confirm
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
