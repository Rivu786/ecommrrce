'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api, formatMoney } from '@/lib/api';

type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
};

const SAMPLE_CSV = `name,slug,description,brand,sku,status,variant_sku,variant_name,price,image_url
Aurora Lamp,aurora-lamp,Desk lamp,Aurora,AURORA-LAMP,ACTIVE,AURORA-LAMP-BLK,Black,2499,https://example.com/aurora.jpg
`;

export default function ProductsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/products');
  const media = useApiList<MediaAsset>('/admin/media');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function importProducts(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];
    if (!file) {
      setActionError('Choose a CSV file first.');
      return;
    }
    setBusy('import');
    setMessage(null);
    setActionError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await api<{ created?: number; updated?: number; errors?: string[] }>(
        '/admin/bulk/products/import',
        { method: 'POST', body },
      );
      const problems = result.errors?.length ? ` ${result.errors.length} row(s) skipped.` : '';
      setMessage(`Import finished. Created ${result.created ?? 0}, updated ${result.updated ?? 0}.${problems}`);
      form.reset();
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Product import failed');
    } finally {
      setBusy(null);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function uploadMedia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];
    if (!file) {
      setActionError('Choose an image first.');
      return;
    }
    setBusy('media');
    setMessage(null);
    setActionError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const saved = await api<MediaAsset & { duplicate?: boolean }>('/admin/media', {
        method: 'POST',
        body,
      });
      setMessage(
        saved.duplicate
          ? `This image is already in the library. Use the existing URL.`
          : `Uploaded ${saved.filename}. Copy its URL into a product or CSV image_url column.`,
      );
      form.reset();
      media.reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Image upload failed');
    } finally {
      setBusy(null);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
    } catch {
      setActionError('Could not copy the URL. Select it from the card instead.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Catalog SKUs, bulk CSV import, and a shared image library"
        actions={
          <>
            <button type="button" className="btn btn-sm" onClick={reload}>
              Refresh
            </button>
            <Link href="/bulk" className="btn btn-sm">
              Inventory import
            </Link>
            <Link href="/products/new" className="btn btn-sm btn-gold">
              New product
            </Link>
          </>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(280px, 1.2fr)', gap: 12 }}>
        <form className="panel stack" onSubmit={importProducts}>
          <h2>Bulk upload</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            CSV columns: name, slug, description, brand, sku, status, variant_sku, variant_name, price, image_url.
            The same image URL on a product is not attached twice.
          </p>
          <div className="field">
            <label htmlFor="products-csv">Products CSV</label>
            <input id="products-csv" name="file" type="file" accept=".csv,text/csv" />
          </div>
          <div className="row">
            <button type="submit" className="btn btn-gold btn-sm" disabled={busy !== null}>
              {busy === 'import' ? 'Uploading…' : 'Upload products'}
            </button>
            <button type="button" className="btn btn-sm" onClick={downloadSample}>
              Sample CSV
            </button>
          </div>
        </form>

        <form className="panel stack" onSubmit={uploadMedia}>
          <h2>Media library</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Upload JPEG, PNG, WebP, or GIF up to 8 MB. An identical file is kept once and the existing URL is reused.
          </p>
          <div className="field">
            <label htmlFor="media-file">Image</label>
            <input id="media-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy !== null}>
            {busy === 'media' ? 'Uploading…' : 'Upload image'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Library URLs</h2>
        {media.loading ? <p style={{ color: 'var(--text-muted)' }}>Loading media…</p> : null}
        {media.error ? <div className="state-box error">{media.error}</div> : null}
        {!media.loading && !media.error && media.rows.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>No images yet.</p>
        ) : null}
        <div className="media-grid">
          {media.rows.map((item) => (
            <article key={item.id} className="media-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.filename} />
              <strong style={{ fontSize: 13 }}>{item.filename}</strong>
              <code title={item.url}>{item.url}</code>
              <button type="button" className="btn btn-sm" onClick={() => copyUrl(item.url)}>
                {copied === item.url ? 'Copied' : 'Copy URL'}
              </button>
            </article>
          ))}
        </div>
      </div>

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No products yet."
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => (
              <Link href={`/products/${encodeURIComponent(String(row.id ?? ''))}`} className="link-gold">
                {String(row.name ?? row.title ?? row.sku ?? row.id ?? '—')}
              </Link>
            ),
          },
          { key: 'sku', header: 'SKU', get: (row) => row.sku ?? row.slug },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status ?? (row.isActive ? 'ACTIVE' : 'DRAFT')} />,
          },
          {
            key: 'price',
            header: 'Price',
            render: (row) => {
              const variants = row.variants as { price?: number }[] | undefined;
              const price = row.price ?? row.basePrice ?? row.minPrice ?? variants?.[0]?.price;
              return formatMoney(price);
            },
          },
          { key: 'updatedAt', header: 'Updated' },
        ]}
      />
    </div>
  );
}
