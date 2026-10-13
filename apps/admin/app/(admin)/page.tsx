'use client';

import Link from 'next/link';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiData } from '@/hooks/useApi';
import { formatMoney } from '@/lib/api';

type Dashboard = {
  periodDays?: number;
  ordersCount?: number;
  revenue?: number;
  pendingPayments?: number;
  eventsByType?: { type: string; count: number }[];
  recentOrders?: Record<string, unknown>[];
  lowStock?: Record<string, unknown>[];
};

export default function DashboardPage() {
  const { data, loading, error, reload } = useApiData<Dashboard>('/admin/analytics/dashboard');

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Last ${data?.periodDays ?? 30} days · Midnight Ledger overview`}
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />

      {error ? <div className="state-box error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="label">Orders</div>
          <div className="value">{loading ? '…' : data?.ordersCount ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Revenue</div>
          <div className="value gold">{loading ? '…' : formatMoney(data?.revenue ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Pending payments</div>
          <div className="value">{loading ? '…' : data?.pendingPayments ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Low stock SKUs</div>
          <div className="value">{loading ? '…' : data?.lowStock?.length ?? 0}</div>
        </div>
      </div>

      <div className="panel">
        <div className="page-header" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Recent orders</h2>
          <Link href="/orders" className="link-gold">
            View all
          </Link>
        </div>
        <DataTable
          loading={loading}
          error={null}
          rows={(data?.recentOrders as Record<string, unknown>[]) || []}
          emptyMessage="No recent orders."
          columns={[
            { key: 'orderNumber', header: 'Order' },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'grandTotal',
              header: 'Total',
              render: (row) => formatMoney(row.grandTotal),
            },
            { key: 'createdAt', header: 'Created' },
          ]}
        />
      </div>
    </div>
  );
}
