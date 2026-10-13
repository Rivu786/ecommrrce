'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getAuthToken,
  getSessionId,
  storeApi,
  type ProductDetail,
} from '@/lib/api';

function formatPrice(value?: number | string | null) {
  if (value === undefined || value === null || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const variant = useMemo(() => product?.variants?.[0], [product]);

  useEffect(() => {
    if (!slug) return;
    void (async () => {
      try {
        setProduct(await storeApi.product(slug));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Product not found');
      }
    })();
  }, [slug]);

  async function addToCart() {
    if (!variant) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const sessionId = getSessionId();
      const token = getAuthToken();
      const cart = await storeApi.getCart(sessionId, token);
      await storeApi.addToCart(cart.id, variant.id, 1);
      setStatus('Added to cart');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart');
    } finally {
      setBusy(false);
    }
  }

  if (error && !product) {
    return (
      <div className="shell section">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="shell section">
        <p className="muted">Loading product…</p>
      </div>
    );
  }

  const image = product.media?.[0]?.url;

  return (
    <div className="shell section">
      <div className="split split-2">
        <div className="panel" style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} style={{ width: '100%', borderRadius: 8 }} />
          ) : (
            <span className="muted">No image</span>
          )}
        </div>
        <div className="stack">
          <div>
            <span className="badge">{product.brand || 'LedgerStore'}</span>
            <h1 className="page-title" style={{ marginTop: '0.6rem' }}>
              {product.name}
            </h1>
            <p className="price" style={{ fontSize: '1.35rem', color: 'var(--gold-soft)', margin: 0 }}>
              {formatPrice(variant?.price)}
            </p>
          </div>
          <p className="muted">{product.description || 'No description provided.'}</p>
          {variant && (
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              SKU {variant.sku}
            </p>
          )}
          <button className="btn btn-primary" type="button" disabled={!variant || busy} onClick={() => void addToCart()}>
            {busy ? 'Adding…' : 'Add to cart'}
          </button>
          {status && <p className="ok">{status}</p>}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
