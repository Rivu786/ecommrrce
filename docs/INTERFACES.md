# OmniCommerce — interfaces, middleware, and what works

API-first multi-tenant commerce. **Any website** talks to REST `/api/v1`. Our own UIs are Admin/POS and Flutter driver. Payments: **cash or QR/UTR only**.

---

## Separate interfaces (what to run)

| Interface | Path | Port | Product? | Purpose |
|-----------|------|------|----------|---------|
| **API** | `apps/api` | `4000` | Yes | NestJS REST + OpenAPI. Source of truth. |
| **Admin + POS** | `apps/admin` | `3001` | Yes | Brand ops, Super Admin brands, POS register |
| **Storefront** | `apps/storefront` | `3000` | No (demo) | Smoke test of public catalog/cart/checkout |
| **Driver (Flutter)** | `apps/delivery_flutter` | device | Yes | Nearby jobs, accept → deliver, earnings |
| **Driver (Expo)** | `apps/delivery` | — | Retired | Do not use |

### Start (two terminals minimum)

```bash
# Terminal 1 — API (must be up for any UI login)
pnpm --filter @omnicommerce/api dev

# Terminal 2 — Admin
pnpm --filter @omnicommerce/admin dev
```

Optional:

```bash
pnpm --filter @omnicommerce/storefront dev
# Flutter: cd apps/delivery_flutter && flutter run --dart-define=API_URL=http://YOUR_LAN_IP:4000/api/v1 --dart-define=TENANT=demo
```

OpenAPI: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## Headers every client must send

| Header | When |
|--------|------|
| `X-Tenant-ID` | Brand slug or UUID (demo = `demo`). Required on almost all routes. |
| `Authorization: Bearer <accessToken>` | After login (admin, staff, customer, driver). |
| `X-Tenant-API-Key` | Optional alternative to resolve tenant (no browser UI yet). |

**Super Admin login:** leave tenant blank (no `X-Tenant-ID`).  
**Brand Admin / staff / storefront / driver:** always `X-Tenant-ID: demo` (or your brand slug).

---

## Middleware & guards (request pipeline)

Order of protection on the API:

```text
Request
  → TenantMiddleware     (resolve brand from header / API key)
  → JwtAuthGuard         (JWT unless @Public())
  → PermissionGuard      (flat keys e.g. orders.write; Super Admin bypass)
  → RolesGuard           (legacy role codes still used on some routes)
  → ThrottlerGuard       (rate limit; auth ~8/min, admin writes stricter)
  → Controller
```

### Tenant middleware (`apps/api/src/tenant/tenant.middleware.ts`)

- Reads `X-Tenant-ID` **or** `X-Tenant-API-Key` **or** `X-Tenant-Slug`.
- Attaches `req.tenant = { id, slug }`.
- **Skips** tenant for: health, docs, uploads, `auth/login`, `auth/refresh`, `auth/register-tenant`, `admin/platform/*`.
- Everything else without a tenant header → `400 TENANT_REQUIRED`.

### Auth / permissions

- JWT access + refresh; bcrypt passwords.
- Super Admin: `tenantId` null, permission `*`.
- Brand Admin: all keys in that brand’s **permission pack**.
- Staff: intersection of custom role keys ∩ pack.
- Matrix docs: [`docs/permissions.md`](permissions.md).

### Rate limits

- Global ~120/min.
- Auth login/register/refresh: ~8/min.
- Admin payments / billing / platform: ~40–60/min.
- Optional `PLATFORM_IP_ALLOWLIST` for `/admin/platform/*`.

---

## Demo credentials (after `pnpm db:seed`)

| Role | Tenant field | Email | Password |
|------|--------------|-------|----------|
| Super Admin | *(blank)* | `super@omni.local` | `super12345` |
| Brand Admin | `demo` | `admin@demo.local` | `admin123` |
| Customer | `demo` | `customer@demo.local` | `customer123` |
| Driver | `demo` | `driver@demo.local` | `driver123` |

---

## What works (by interface)

### API (`:4000`)

- Catalog (products, variants, categories, SEO, related/recommended, add-ons, auto SKU, JSON-LD)
- Inventory (warehouses, adjust, transfer, reservations, inbound PO receive)
- Cart (guest session + merge on login)
- Checkout (cash / QR+UTR+bank name; tax from `taxRulesJson`; shipping rates if method set)
- Payments queue (submit UTR → admin confirm/reject)
- Invoice / receipt PDFs → `/uploads/`
- Orders list + **status** (PROCESSING / SHIPPED / DELIVERED / CANCELLED)
- Staff + custom roles (pack ceiling)
- Platform Super Admin brands + Brand Admins + packs
- Providers + requirements (RFQ-lite)
- POS via same cart/checkout with `channel: POS`
- Analytics (top/least, hourly, online vs POS)
- Driver jobs + commission earnings
- Returns → store credit + **restock**
- Bulk CSV import/export
- Webhooks CRUD (HMAC)

### Admin UI (`:3001`)

| Route | Works |
|-------|--------|
| `/login` | Brand or Super Admin |
| `/brands` | Super Admin create brand + Brand Admin |
| `/products`, `/products/new`, `/products/[id]` | List + create/edit |
| `/pos` | Cash / QR register |
| `/orders`, `/orders/[id]` | List + fulfill/cancel + PDF |
| `/payments` | Confirm/reject UTR |
| `/inventory` | Levels + adjust + transfer + PO |
| `/staff` | Staff + permission checklist roles |
| `/providers`, `/requirements` | 3rd-party + RFQ |
| `/merchandising` | Pin/hide related |
| `/reports` | KPIs + top/least + hourly + channel |
| `/settings` | Tenant GST/UPI/commission fields |

Many other nav pages are **list-only** (categories, CMS, vendors, etc.).

### Storefront (`:3000`) — demo only

Home, product list/PDP, cart, QR checkout, account login. Not a theme builder.

### Flutter driver

Login → online toggle → nearby jobs → accept / arrive / pickup / deliver → earnings after commission %.

---

## How to check middleware & each interface

### 1. API up?

```bash
curl http://localhost:4000/api/v1/health
```

If this fails, Admin login will also fail (“Unable to connect”).

### 2. Tenant middleware

```bash
# Missing tenant → should 400 TENANT_REQUIRED
curl http://localhost:4000/api/v1/products

# With tenant → 200
curl -H "X-Tenant-ID: demo" http://localhost:4000/api/v1/products
```

### 3. Auth + JWT

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: demo" \
  -d "{\"email\":\"admin@demo.local\",\"password\":\"admin123\"}"
```

Use returned `accessToken` as `Authorization: Bearer …` on `/admin/orders`, etc.

### 4. Super Admin (no tenant header)

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"super@omni.local\",\"password\":\"super12345\"}"
```

Then call `/admin/platform/brands` with Bearer token (no `X-Tenant-ID`).

### 5. Permission guard

Staff without `payments.verify_qr` should get `403` on `/admin/payments/:id/confirm`. Brand Admin with full pack should succeed.

### 6. Admin UI smoke

1. Open `http://localhost:3001/login`
2. Tenant `demo` + `admin@demo.local` / `admin123`
3. Open Products, POS, Orders, Payments, Inventory, Staff, Reports

### 7. Public shipping + tax path

```bash
curl -H "X-Tenant-ID: demo" "http://localhost:4000/api/v1/shipping/rates?country=IN"
```

Checkout uses `taxRulesJson.ratePct` (seed default 18%) and optional `shippingMethod` (`standard` / `express`).

---

## Env notes

- Root [`.env`](../.env) and/or [`apps/api/.env`](../apps/api/.env) must have a working `DATABASE_URL`.
- Prisma reads env from `apps/api` when you run `pnpm db:push` / API.
- Admin needs `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` (see `apps/admin/.env.local.example`).
- Docker is optional if MySQL is already reachable (local or remote host).

---

## Related docs

- [`docs/permissions.md`](permissions.md) — permission keys
- [`docs/ui-reference.md`](ui-reference.md) — Midnight Ledger tokens
- [`docs/stitch-admin.md`](stitch-admin.md) — admin screen map
- OpenAPI: `/api/docs` when API is running
