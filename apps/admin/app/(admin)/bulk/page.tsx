'use client';

import { FormEvent, useState } from 'react';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

export default function BulkPage() {
  const { rows, loading, error, reload } = useApiList('/admin/bulk/jobs');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function exportData(kind: 'products' | 'inventory') {
    setBusy(kind);
    setMessage(null);
    setActionError(null);
    try {
      await api(`/admin/bulk/${kind}/export`, { method: 'POST' });
      setMessage(`${kind} export started.`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to export ${kind}`);
    } finally {
      setBusy(null);
    }
  }

  async function importFile(kind: 'products' | 'inventory', e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setActionError('Choose a CSV/XLSX file first.');
      return;
    }
    setBusy(`import-${kind}`);
    setMessage(null);
    setActionError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      await api(`/admin/bulk/${kind}/import`, { method: 'POST', body });
      setMessage(`${kind} import submitted.`);
      form.reset();
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to import ${kind}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="System · Bulk"
        description="Import / export catalog and inventory"
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh jobs
          </button>
        }
      />

      {message ? (
        <div className="state-box" style={{ marginBottom: 12, color: 'var(--success)' }}>
          {message}
        </div>
      ) : null}
      {actionError ? (
        <div className="state-box error" style={{ marginBottom: 12 }}>
          {actionError}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="panel stack">
          <h2>Products</h2>
          <form className="stack" onSubmit={(e) => importFile('products', e)}>
            <div className="field">
              <label htmlFor="products-file">Import file</label>
              <input id="products-file" name="file" type="file" accept=".csv,.xlsx,.xls" />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-gold btn-sm" disabled={busy !== null}>
                {busy === 'import-products' ? 'Uploading…' : 'Import products'}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy !== null}
                onClick={() => exportData('products')}
              >
                {busy === 'products' ? 'Starting…' : 'Export products'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel stack">
          <h2>Inventory</h2>
          <form className="stack" onSubmit={(e) => importFile('inventory', e)}>
            <div className="field">
              <label htmlFor="inventory-file">Import file</label>
              <input id="inventory-file" name="file" type="file" accept=".csv,.xlsx,.xls" />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-gold btn-sm" disabled={busy !== null}>
                {busy === 'import-inventory' ? 'Uploading…' : 'Import inventory'}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy !== null}
                onClick={() => exportData('inventory')}
              >
                {busy === 'inventory' ? 'Starting…' : 'Export inventory'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <h2>Bulk jobs</h2>
        <DataTable
          loading={loading}
          error={error}
          rows={rows}
          emptyMessage="No bulk jobs yet."
          columns={[
            { key: 'id', header: 'Job ID' },
            { key: 'type', header: 'Type', get: (row) => row.type ?? row.kind },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusBadge status={row.status} />,
            },
            { key: 'createdAt', header: 'Created' },
            { key: 'finishedAt', header: 'Finished', get: (row) => row.finishedAt ?? row.completedAt },
          ]}
        />
      </div>
    </div>
  );
}
