import Link from 'next/link';
import { storeApi, type HomepageSection, type ProductListItem } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

function normalizeProducts(
  data: Awaited<ReturnType<typeof storeApi.products>>,
): ProductListItem[] {
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export default async function HomePage() {
  let sections: HomepageSection[] = [];
  let products: ProductListItem[] = [];

  try {
    const [home, catalog] = await Promise.all([
      storeApi.homepage(),
      storeApi.products({ take: 8 }),
    ]);
    sections = Array.isArray(home) ? home : [];
    products = normalizeProducts(catalog);
  } catch {
    sections = [];
    products = [];
  }

  const hero =
    sections.find((s) => s.type === 'HERO' || s.type === 'hero') ||
    sections[0];
  const heroTitle =
    (hero?.configJson?.headline as string) ||
    hero?.title ||
    'Commerce with quiet confidence';
  const heroCopy =
    (hero?.configJson?.subcopy as string) ||
    'Curated goods, instant UPI checkout, and orders that feel as refined as the brand.';

  return (
    <div className="shell">
      <section className="hero">
        <span className="badge">LedgerStore</span>
        <h1>{heroTitle}</h1>
        <p>{heroCopy}</p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/products">
            Shop collection
          </Link>
          <Link className="btn btn-ghost" href="/account">
            Sign in
          </Link>
        </div>
      </section>

      {sections.length > 1 && (
        <section className="section">
          <h2 className="section-title">From the floor</h2>
          <p className="section-sub">Homepage sections from the CMS API.</p>
          <div className="stack">
            {sections.slice(1).map((section) => (
              <article key={section.id} className="panel">
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
                  {section.title || section.type}
                </h3>
                <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                  {typeof section.configJson?.body === 'string'
                    ? section.configJson.body
                    : `Section type: ${section.type}`}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Featured</h2>
        <p className="section-sub">Live catalog from the OmniCommerce API.</p>
        {products.length === 0 ? (
          <p className="muted">No products yet. Seed the API and refresh.</p>
        ) : (
          <div className="grid-products">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
