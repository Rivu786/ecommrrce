import Link from 'next/link';
import { productImage, type ProductListItem } from '@/lib/api';

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

export function ProductCard({ product }: { product: ProductListItem }) {
  const price = product.variants?.[0]?.price;
  const image = productImage(product);

  return (
    <Link href={`/products/${product.slug}`} className="product-card">
      <div className="media">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.alt || product.name} />
        ) : (
          <span>No image</span>
        )}
      </div>
      <div className="body">
        <h3>{product.name}</h3>
        {product.brand ? <p className="muted" style={{ margin: '0 0 0.35rem', fontSize: '0.85rem' }}>{product.brand}</p> : null}
        <div className="price">{formatPrice(price)}</div>
      </div>
    </Link>
  );
}
