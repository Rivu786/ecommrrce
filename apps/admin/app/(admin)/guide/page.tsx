'use client';

import { PageHeader } from '@/components/DataTable';

const MAP = [
  { page: 'Home / CMS', api: 'GET /homepage' },
  { page: 'Shop list', api: 'GET /products?q=&categoryId=&cursor=' },
  { page: 'Product detail', api: 'GET /products/:slug (+ related, availability, SEO)' },
  { page: 'JSON-LD SEO', api: 'GET /products/:slug/json-ld' },
  { page: 'Shipping options', api: 'GET /shipping/rates?country=IN' },
  { page: 'Cart', api: 'GET /cart?sessionId=… · POST /cart/:id/items' },
  { page: 'Login + merge', api: 'POST /auth/login · POST /cart/merge' },
  { page: 'Checkout', api: 'POST /orders/checkout (QR_UTR or CASH)' },
  { page: 'Pay proof', api: 'POST /payments/verify-submit (UTR + bank name)' },
  { page: 'My orders', api: 'GET /orders/mine' },
];

export default function GuidePage() {
  return (
    <div>
      <PageHeader
        title="Website integration guide"
        description="Map OmniCommerce API onto your own ecommerce site. Admin is ops only — your site is the storefront."
      />

      <div className="panel stack" style={{ marginBottom: 16 }}>
        <h2>How it connects</h2>
        <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
{`Your website  ── X-Tenant-ID + REST ──►  API /api/v1
Admin / POS    ── same API ───────────►  catalog, payments, staff
Flutter driver ── same API ───────────►  delivery jobs`}
        </pre>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Env on your site: <code>NEXT_PUBLIC_OMNI_API</code> + <code>NEXT_PUBLIC_TENANT_SLUG</code> (this brand’s slug).
          Every call sends header <code>X-Tenant-ID</code>. After customer login, also{' '}
          <code>Authorization: Bearer …</code>.
        </p>
        <p style={{ margin: 0 }}>
          Full write-up: <code>docs/WEBSITE_GUIDE.md</code> · OpenAPI:{' '}
          <a className="link-gold" href="http://localhost:4000/api/docs" target="_blank" rel="noreferrer">
            /api/docs
          </a>
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Page → API map</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Your website page</th>
                <th>API</th>
              </tr>
            </thead>
            <tbody>
              {MAP.map((row) => (
                <tr key={row.page}>
                  <td>{row.page}</td>
                  <td>
                    <code>{row.api}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel stack" style={{ marginBottom: 16 }}>
        <h2>Checkout body (paste into your site)</h2>
        <pre style={{ margin: 0, fontSize: 12, overflow: 'auto' }}>
{`{
  "cartId": "...",
  "fulfillmentMode": "HOME_DELIVERY",
  "paymentMethod": "QR_UTR",
  "shippingMethod": "standard",
  "channel": "ONLINE",
  "shippingAddressJson": {
    "fullName": "...", "phone": "...", "line1": "...",
    "city": "...", "country": "IN", "postalCode": "..."
  }
}`}
        </pre>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Customer pays UPI → submit UTR + bank name → you confirm in <strong>Payments</strong> → order
          CONFIRMED → delivery job if home delivery.
        </p>
      </div>

      <div className="panel stack">
        <h2>Go-live checklist</h2>
        <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Settings: UPI, bank, GST, tax %, CORS origins = your website domain</li>
          <li>Products ACTIVE with warehouse stock</li>
          <li>Website env points at production API HTTPS URL</li>
          <li>Smoke: browse → cart → QR checkout → UTR → confirm here</li>
        </ul>
      </div>
    </div>
  );
}
