'use client';

import { DataTable, PageHeader } from '@/components/DataTable';
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

export default function ReportsPage() {
  const { data, loading, error, reload } = useApiData<Dashboard>('/admin/analytics/dashboard');
  const reports = useApiData<{
    top: { sku: string; name: string; qty: number; revenue: number }[];
    least: { sku: string; name: string; qty: number; revenue: number }[];
    hourly: { hour: number; revenue: number; orders: number }[];
    channels: { online: number; pos: number };
  }>('/admin/analytics/reports');

  const eventRows = (data?.eventsByType || []).map((e) => ({
    id: e.type,
    type: e.type,
    count: e.count,
  }));

  const stockRows: Record<string, any>[] = (data?.lowStock || []).map((row, i) => ({
    id: String(row.id ?? i),
    ...row,
  }));

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Operational analytics snapshot"
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />

      {error ? <div className="state-box error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="label">Orders ({data?.periodDays ?? 30}d)</div>
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
          <div className="label">Low stock</div>
          <div className="value">{loading ? '…' : stockRows.length}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Online vs POS</div>
          <div className="value" style={{ fontSize: 16 }}>
            {formatMoney(reports.data?.channels?.online ?? 0)} / {formatMoney(reports.data?.channels?.pos ?? 0)}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Top products</h2>
        <DataTable
          loading={reports.loading}
          error={null}
          rows={(reports.data?.top || []) as unknown as Record<string, unknown>[]}
          emptyMessage="No sales."
          columns={[
            { key: 'sku', header: 'SKU' },
            { key: 'name', header: 'Name' },
            { key: 'qty', header: 'Qty' },
            { key: 'revenue', header: 'Revenue', render: (r) => formatMoney(r.revenue) },
          ]}
        />
      </div>
      <div className="panel">
        <h2>Least products</h2>
        <DataTable
          loading={reports.loading}
          error={null}
          rows={(reports.data?.least || []) as unknown as Record<string, unknown>[]}
          emptyMessage="No sales."
          columns={[
            { key: 'sku', header: 'SKU' },
            { key: 'name', header: 'Name' },
            { key: 'qty', header: 'Qty' },
            { key: 'revenue', header: 'Revenue', render: (r) => formatMoney(r.revenue) },
          ]}
        />
      </div>
      <div className="panel">
        <h2>Hourly</h2>
        <DataTable
          loading={reports.loading}
          error={null}
          rows={(reports.data?.hourly || []) as unknown as Record<string, unknown>[]}
          emptyMessage="No hourly data."
          columns={[
            { key: 'hour', header: 'Hour' },
            { key: 'orders', header: 'Orders' },
            { key: 'revenue', header: 'Revenue', render: (r) => formatMoney(r.revenue) },
          ]}
        />
      </div>

      <div className="panel">
        <h2>Events by type</h2>
        <DataTable
          loading={loading}
          error={null}
          rows={eventRows}
          emptyMessage="No analytics events."
          columns={[
            { key: 'type', header: 'Event' },
            { key: 'count', header: 'Count' },
          ]}
        />
      </div>

      <div className="panel">
        <h2>Low stock</h2>
        <DataTable
          loading={loading}
          error={null}
          rows={stockRows}
          emptyMessage="No low-stock items."
          columns={[
            {
              key: 'sku',
              header: 'SKU',
              get: (row) => row.variant?.sku ?? row.sku ?? row.variantId,
            },
            {
              key: 'warehouse',
              header: 'Warehouse',
              get: (row) => row.warehouse?.name ?? row.warehouseId,
            },
            { key: 'quantity', header: 'Qty' },
          ]}
        />
      </div>
    </div>
  );
}
