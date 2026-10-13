# Map OmniCommerce to your ecommerce website

You do **not** rebuild the store in Admin. Your own site (Next, WordPress, React, Flutter web, etc.) becomes the storefront by calling the OmniCommerce API.

```text
Your website  ──X-Tenant-ID + REST──►  OmniCommerce API (:4000/api/v1)
Admin / POS   ──same API────────────►  catalog, orders, payments, staff
Flutter driver ──same API───────────►  delivery jobs
```

OpenAPI live map: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## 1. One-time brand setup (Admin)

1. Super Admin creates your brand (or use seed tenant `demo`).
2. Brand Admin logs in with `X-Tenant-ID` = your **slug** (e.g. `demo`).
3. In **Settings**: UPI ID, bank, GSTIN, logo, `taxRulesJson`, delivery commission.
4. Add products / inventory (Admin or `POST /admin/products`).
5. Copy your **tenant slug** into the website env.

---

## 2. Website env (map once)

```bash
NEXT_PUBLIC_OMNI_API=http://localhost:4000/api/v1   # production: https://api.yourdomain.com/api/v1
NEXT_PUBLIC_TENANT_SLUG=demo                          # your brand slug
```

Every request:

```http
X-Tenant-ID: demo
Content-Type: application/json
Authorization: Bearer <token>   # only after customer login
```

---

## 3. Page → API map (copy into your site)

| Your website page | Call | Notes |
|-------------------|------|--------|
| Home / CMS | `GET /homepage` | Sections from Admin CMS |
| Shop / collection | `GET /products?categoryId=&q=&cursor=` | Cursor pagination |
| Product detail (PDP) | `GET /products/:slug` | Includes related, recommended, add-ons, **availability** by warehouse, SEO fields |
| SEO / JSON-LD | `GET /products/:slug/json-ld` | Inject into `<script type="application/ld+json">` |
| Categories | `GET /categories` | Nav / filters |
| Shipping options | `GET /shipping/rates?country=IN` | Show Standard / Express |
| Create cart | `GET /cart?sessionId=<uuid>` | Store UUID in cookie/localStorage |
| Add to cart | `POST /cart/:id/items` | `{ variantId, quantity, notes? }` |
| Update / remove | `PATCH` / `DELETE` `/cart/:id/items/:itemId` | |
| Coupon | `POST /cart/:id/coupon` | `{ code }` |
| Login / register | `POST /auth/login`, `POST /auth/register` | Then merge cart |
| Merge guest cart | `POST /cart/merge` | `{ sessionId }` + Bearer |
| Checkout | `POST /orders/checkout` | See body below |
| Show QR | from checkout `payment.qrCodeUrl` | Customer pays via UPI |
| Submit UTR | `POST /payments/verify-submit` | `{ orderPaymentReference, utr, payerBankName }` |
| My orders | `GET /orders/mine` | Bearer |
| Order detail | `GET /orders/:id` | Bearer |
| Track analytics | `POST /analytics/track` | Optional product views / add-to-cart |

### Checkout body (map your form)

```json
{
  "cartId": "...",
  "fulfillmentMode": "HOME_DELIVERY",
  "paymentMethod": "QR_UTR",
  "shippingMethod": "standard",
  "channel": "ONLINE",
  "shippingAddressJson": {
    "fullName": "...",
    "phone": "...",
    "line1": "...",
    "city": "...",
    "state": "...",
    "country": "IN",
    "postalCode": "..."
  },
  "guestJson": { "email": "..." }
}
```

Cash instead of QR: `"paymentMethod": "CASH"` (POS / COD-style; admin may still confirm ops).

After QR pay: customer submits **UTR + bank name** → Brand Admin confirms in Admin → `/payments` → order confirmed → delivery job if `HOME_DELIVERY`.

---

## 4. Minimal JS helper (any frontend)

```js
const API = process.env.NEXT_PUBLIC_OMNI_API;
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG;

export async function omni(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.message || res.statusText), { data, status: res.status });
  return data;
}
```

Reference implementation: [`apps/storefront`](../apps/storefront) (smoke demo only — copy patterns, not themes).

---

## 5. What Admin does vs your website

| Job | Where |
|-----|--------|
| Products, stock, prices, SEO meta | Admin (or your script → Admin APIs) |
| Coupons, CMS homepage | Admin |
| Confirm UTR / cash ops | Admin `/payments` |
| Invoices / receipts | Admin billing APIs |
| Staff permissions | Admin `/staff` |
| Customer shop UI, cart, checkout UX | **Your website** |
| Delivery tracking UI for riders | Flutter app |

There is **no** Shopify-style theme builder. Your site owns HTML/CSS; Omni owns commerce data and money flow.

---

## 6. Production checklist

- [ ] Point `NEXT_PUBLIC_OMNI_API` at your deployed API HTTPS URL  
- [ ] CORS: set `corsOrigins` in Admin Settings to your website origin  
- [ ] Tenant slug matches production brand  
- [ ] UPI / bank / GST filled  
- [ ] Products `ACTIVE` with stock in a warehouse  
- [ ] Test: browse → cart → checkout QR → UTR submit → Admin confirm → order CONFIRMED  

Permissions for third-party sites: [`permissions.md`](permissions.md). Full stack map: [`INTERFACES.md`](INTERFACES.md).
