'use client';

import { cell } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Column<T = Record<string, any>> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  get?: (row: T) => unknown;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  loading,
  error,
  emptyMessage = 'No records found.',
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return <div className="state-box">Loading…</div>;
  }
  if (error) {
    return <div className="state-box error">{error}</div>;
  }
  if (!rows.length) {
    return <div className="state-box">{emptyMessage}</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey?.(row, index) || String(row.id ?? index)}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(row)
                    : cell(col.get ? col.get(row) : row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status }: { status?: unknown }) {
  const value = String(status ?? '—').toUpperCase();
  const gold = ['PENDING', 'SUBMITTED', 'VERIFICATION_IN_PROGRESS', 'AWAITING', 'PROCESSING', 'SHIPPED'].some(
    (s) => value.includes(s),
  );
  const success = ['CONFIRMED', 'APPROVED', 'PAID', 'DELIVERED', 'ACTIVE', 'COMPLETED'].some((s) =>
    value.includes(s),
  );
  const danger = ['REJECTED', 'CANCELLED', 'FAILED', 'REFUNDED'].some((s) => value.includes(s));
  const warning = ['LOW', 'DRAFT', 'PAUSED'].some((s) => value.includes(s));

  let cls = 'badge badge-slate';
  if (gold) cls = 'badge badge-gold';
  else if (success) cls = 'badge badge-success';
  else if (danger) cls = 'badge badge-danger';
  else if (warning) cls = 'badge badge-warning';

  return <span className={cls}>{value}</span>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="row">{actions}</div> : null}
    </div>
  );
}
