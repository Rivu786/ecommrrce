'use client';

import { FormEvent, useState } from 'react';
import { DataTable, PageHeader } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

export default function ProvidersPage() {
  const { rows, loading, error, reload } = useApiList('/admin/providers');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('logistics');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/providers', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, category, notes }),
      });
      reload();
      setMsg('Saved');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <PageHeader title="Service providers" description="3rd parties: name, contact, category, notes" />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}
      <form className="panel stack" onSubmit={onCreate} style={{ maxWidth: 480, marginBottom: 16 }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
        <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn btn-primary" type="submit">
          Add provider
        </button>
      </form>
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No providers."
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'phone', header: 'Phone' },
          { key: 'category', header: 'Category' },
        ]}
      />
    </div>
  );
}
