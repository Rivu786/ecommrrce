'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/DataTable';
import { ApiError, api, formatMoney } from '@/lib/api';

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sku?: string;
  status?: string;
  brand?: string;
  metaTitle?: string;
  metaDescription?: string;
  variants?: { id: string; sku: string; price: number; name?: string }[];
  availability?: { warehouseName: string; available: number; variantId: string }[];
};

export default function ProductEditPage() {
  const params = useParams();
  const id = String(params.id || '');
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', status: 'DRAFT', brand: '', metaTitle: '', metaDescription: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api<Product>(`/admin/products/${id}`)
      .then((found) => {
        setProduct(found);
        setForm({
          name: found.name || '',
          slug: found.slug || '',
          description: found.description || '',
          status: found.status || 'DRAFT',
          brand: found.brand || '',
          metaTitle: found.metaTitle || '',
          metaDescription: found.metaDescription || '',
        });
      })
      .catch((err) => setMsg(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const updated = await api<Product>(`/admin/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setProduct(updated);
      setMsg('Saved');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Save failed');
    }
  }

  if (loading) return <div className="state-box">Loading…</div>;

  return (
    <div>
      <PageHeader
        title={form.name || 'Edit product'}
        description={`SKU ${product?.sku || '—'}`}
        actions={
          <Link href="/products" className="btn btn-sm">
            Back to list
          </Link>
        }
      />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}
      <form className="panel stack" onSubmit={onSubmit} style={{ maxWidth: 560, marginBottom: 16 }}>
        <div className="field">
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="field">
          <label>Slug</label>
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
        </div>
        <div className="field">
          <label>Brand</label>
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
        </div>
        <div className="field">
          <label>Meta title</label>
          <input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
        </div>
        <div className="field">
          <label>Meta description</label>
          <textarea value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={2} />
        </div>
        <button className="btn btn-primary" type="submit">
          Save
        </button>
      </form>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Variants</h2>
        <ul className="stack">
          {(product?.variants || []).map((v) => (
            <li key={v.id}>
              {v.sku} · {v.name || 'Default'} · {formatMoney(v.price)}
            </li>
          ))}
        </ul>
      </div>

      {(product?.availability || []).length ? (
        <div className="panel">
          <h2>Location availability</h2>
          <ul className="stack">
            {product!.availability!.map((a, i) => (
              <li key={i}>
                {a.warehouseName}: {a.available} available
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
