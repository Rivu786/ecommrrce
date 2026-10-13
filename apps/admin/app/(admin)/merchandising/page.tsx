'use client';

import { FormEvent, useState } from 'react';
import { PageHeader } from '@/components/DataTable';
import { ApiError, api } from '@/lib/api';

export default function MerchandisingPage() {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [hideId, setHideId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function pin(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api(`/admin/products/${fromId}/relations`, {
        method: 'POST',
        body: JSON.stringify({ toProductId: toId, relationType: 'RELATED' }),
      });
      setMsg('Pinned related product');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  async function hide(e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/admin/products/${fromId}/hide-recommendation`, {
        method: 'POST',
        body: JSON.stringify({ hiddenId: hideId }),
      });
      setMsg('Hidden from recommended');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <PageHeader
        title="Merchandising"
        description="Pin related products and hide recommended SKUs. PDP still auto-fills from category and also-bought."
      />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}
      <form className="panel stack" onSubmit={pin} style={{ maxWidth: 480, marginBottom: 16 }}>
        <h2>Pin related</h2>
        <div className="field">
          <label>From product ID</label>
          <input value={fromId} onChange={(e) => setFromId(e.target.value)} required />
        </div>
        <div className="field">
          <label>To product ID</label>
          <input value={toId} onChange={(e) => setToId(e.target.value)} required />
        </div>
        <button className="btn btn-primary" type="submit">
          Pin
        </button>
      </form>
      <form className="panel stack" onSubmit={hide} style={{ maxWidth: 480 }}>
        <h2>Hide recommended</h2>
        <div className="field">
          <label>Product ID</label>
          <input value={fromId} onChange={(e) => setFromId(e.target.value)} required />
        </div>
        <div className="field">
          <label>Hide product ID</label>
          <input value={hideId} onChange={(e) => setHideId(e.target.value)} required />
        </div>
        <button className="btn" type="submit">
          Hide
        </button>
      </form>
    </div>
  );
}
