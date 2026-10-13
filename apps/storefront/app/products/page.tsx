'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { catalogPage, storeApi, type ProductListItem } from '@/lib/api';

export default function ProductsPage() {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async (opts?: { reset?: boolean; cursor?: string; query?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await storeApi.products({
        take: 12,
        cursor: opts?.cursor,
        q: opts?.query || undefined,
      });
      const page = catalogPage<ProductListItem>(data);
      setItems((prev) => (opts?.reset ? page.items : [...prev, ...page.items]));
      setCursor(page.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ reset: true });
  }, [load]);

  return (
    <div className="shell section">
      <h1 className="page-title">Products</h1>
      <p className="section-sub">Cursor-based feed from `/products`.</p>

      <form
        className="row"
        style={{ marginBottom: '1.25rem', justifyContent: 'flex-start' }}
        onSubmit={(e) => {
          e.preventDefault();
          void load({ reset: true, query: q });
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search catalog"
          aria-label="Search products"
          style={{
            flex: 1,
            maxWidth: 360,
            borderRadius: 8,
            border: '1px solid rgba(154,168,192,0.25)',
            background: 'rgba(11,18,32,0.7)',
            color: 'var(--ink)',
            padding: '0.7rem 0.8rem',
          }}
        />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="grid-products">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {cursor ? (
          <button
            className="btn btn-ghost"
            type="button"
            disabled={loading}
            onClick={() => void load({ cursor })}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : (
          !loading && items.length > 0 && <p className="muted">End of catalog.</p>
        )}
        {loading && items.length === 0 && <p className="muted">Loading products…</p>}
        {!loading && items.length === 0 && !error && (
          <p className="muted">No products found.</p>
        )}
      </div>
    </div>
  );
}
