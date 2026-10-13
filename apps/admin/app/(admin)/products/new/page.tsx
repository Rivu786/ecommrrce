'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/DataTable';
import { ApiError, api } from '@/lib/api';

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('0');
  const [status, setStatus] = useState('DRAFT');
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const product = await api<{ id: string }>('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
          description,
          status,
          variants: [{ price: Number(price), name: 'Default' }],
        }),
      });
      router.push(`/products/${product.id}`);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New product"
        description="Create SKU with a default variant"
        actions={
          <Link href="/products" className="btn btn-sm">
            Back
          </Link>
        }
      />
      {msg ? <div className="state-box error" style={{ marginBottom: 12 }}>{msg}</div> : null}
      <form className="panel stack" onSubmit={onSubmit} style={{ maxWidth: 520 }}>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" />
        </div>
        <div className="field">
          <label>Price</label>
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
          </select>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Create'}
        </button>
      </form>
    </div>
  );
}
