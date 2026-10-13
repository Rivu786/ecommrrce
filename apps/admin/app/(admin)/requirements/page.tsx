'use client';

import { FormEvent, useState } from 'react';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

export default function RequirementsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/requirements');
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      const row = await api<{ id: string }>('/admin/requirements', {
        method: 'POST',
        body: JSON.stringify({ title, itemsJson: { lines: [] } }),
      });
      await api(`/admin/requirements/${row.id}/send`, { method: 'POST' });
      setTitle('');
      setMsg('Requirement sent');
      reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <PageHeader title="Requirements" description="Send RFQ-lite to vendors / providers" />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}
      <form className="row" onSubmit={onCreate} style={{ gap: 8, marginBottom: 16 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <button className="btn btn-primary" type="submit">
          Create & send
        </button>
      </form>
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No requirements."
        columns={[
          { key: 'title', header: 'Title' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
          },
        ]}
      />
    </div>
  );
}
