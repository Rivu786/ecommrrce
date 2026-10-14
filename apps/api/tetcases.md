# OmniCommerce Scenario Test Cases

**Environment**
- API base: `http://localhost:4000/api/v1`
- Tenant header: `X-Tenant-ID: demo`
- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Seed users: `admin@demo.local` / `admin123`, `customer@demo.local` / `customer123` (or seed password), `driver@demo.local`

**Conventions**
- Test data prefix: `tc-` (products, coupons, attributes, etc.)
- Status values used in the report: `PASS`, `FAIL`, `BLOCKED`, `NOT_IMPLEMENTED`
- Actors: Guest, Customer, Admin, Driver, Unauthenticated

---

## 1. Products — CRUD, bulk, catalog

### TC-PROD-001 — Admin create product
| Field | Value |
|-------|-------|
| Area | Products |
| Actor | Admin |
| Preconditions | Logged in as tenant admin; valid JWT |
| Steps | 1. `POST /admin/products` with name `tc-Product A`, slug `tc-product-a`, sku `TC-SKU-A`, variants `[{ sku: "TC-SKU-A-1", price: 999 }]` 2. Note returned `id` |
| Expected | `201/200` with product id, slug `tc-product-a`, at least one variant |

### TC-PROD-002 — Admin update product
| Field | Value |
|-------|-------|
| Area | Products |
| Actor | Admin |
| Preconditions | TC-PROD-001 product exists |
| Steps | 1. `PATCH /admin/products/:id` with `name: "tc-Product A Updated"`, `description: "updated"` |
| Expected | Product name and description updated; GET returns new values |

### TC-PROD-003 — Admin delete product
| Field | Value |
|-------|-------|
| Area | Products |
| Actor | Admin |
| Preconditions | Disposable `tc-` product exists |
| Steps | 1. `DELETE /admin/products/:id` 2. `GET /admin/products/:id` or public `GET /products/:idOrSlug` |
| Expected | Delete succeeds; subsequent GET returns 404 or inactive |

### TC-PROD-004 — Create product validation failure
| Field | Value |
|-------|-------|
| Area | Products |
| Actor | Admin |
| Preconditions | Admin JWT |
| Steps | 1. `POST /admin/products` with empty body or missing `name`/`slug` |
| Expected | `400` validation error; no product created |

### TC-PROD-005 — Duplicate SKU / slug rejected
| Field | Value |
|-------|-------|
| Area | Products |
| Actor | Admin |
| Preconditions | Seed product `aurora-headphones` / `AURORA-HP` exists |
| Steps | 1. `POST /admin/products` with slug `aurora-headphones` or conflicting SKU |
| Expected | Error (conflict/unique); seed product unchanged |

### TC-PROD-006 — Public catalog lists new product
| Field | Value |
|-------|-------|
| Area | Products |
| Actor | Guest |
| Preconditions | Active published product created |
| Steps | 1. `GET /products` with tenant header 2. Search for `tc-` product |
| Expected | Product appears in list when status is active/published |

### TC-PROD-007 — Bulk product CSV import
| Field | Value |
|-------|-------|
| Area | Products / Bulk |
| Actor | Admin |
| Preconditions | Admin JWT |
| Steps | 1. `POST /admin/bulk/products/import` with CSV body/file containing `tc-bulk-1` row 2. `GET /admin/bulk/jobs` |
| Expected | Import job succeeds; product(s) created; job listed |

### TC-PROD-008 — Bulk product export
| Field | Value |
|-------|-------|
| Area | Products / Bulk |
| Actor | Admin |
| Steps | 1. `POST /admin/bulk/products/export` |
| Expected | CSV or export payload returned with product rows |

### TC-PROD-009 — Unauthenticated admin product create rejected
| Field | Value |
|-------|-------|
| Area | Products |
| Actor | Unauthenticated |
| Steps | 1. `POST /admin/products` without Bearer token |
| Expected | `401` / `403` |

---

## 2. Product attributes

### TC-ATTR-001 — List attributes
| Field | Value |
|-------|-------|
| Area | Attributes |
| Actor | Admin |
| Steps | 1. `GET /admin/attributes` |
| Expected | Array including seed `color` attribute |

### TC-ATTR-002 — Create attribute
| Field | Value |
|-------|-------|
| Area | Attributes |
| Actor | Admin |
| Steps | 1. `POST /admin/attributes` with code `tc-size`, name `TC Size`, type `select`, values `["S","M","L"]` |
| Expected | Attribute created with values |

### TC-ATTR-003 — Update attribute
| Field | Value |
|-------|-------|
| Area | Attributes |
| Actor | Admin |
| Preconditions | TC-ATTR-002 |
| Steps | 1. `PATCH /admin/attributes/:id` with `name: "TC Size Updated"` |
| Expected | Name updated |

### TC-ATTR-004 — Delete attribute
| Field | Value |
|-------|-------|
| Area | Attributes |
| Actor | Admin |
| Preconditions | Disposable `tc-` attribute |
| Steps | 1. `DELETE /admin/attributes/:id` |
| Expected | Attribute removed from list |

### TC-ATTR-005 — Attach attribute context via product update
| Field | Value |
|-------|-------|
| Area | Attributes |
| Actor | Admin |
| Preconditions | Product and attribute exist |
| Steps | 1. Update product (or assign attribute values per admin UI/API) 2. Fetch product admin detail |
| Expected | Product detail reflects attribute association or values when supported |

---

## 3. Auth — login, register, forgot password (frontend + API)

### TC-AUTH-001 — Customer login (API)
| Field | Value |
|-------|-------|
| Area | Auth |
| Actor | Customer |
| Steps | 1. `POST /auth/login` with `X-Tenant-ID: demo`, body `{ email: "customer@demo.local", password: "<seed>" }` |
| Expected | Access + refresh tokens returned |

### TC-AUTH-002 — Admin login (API)
| Field | Value |
|-------|-------|
| Area | Auth |
| Actor | Admin |
| Steps | 1. `POST /auth/login` with tenant header and `admin@demo.local` / `admin123` |
| Expected | Tokens returned; roles include TENANT_ADMIN |

### TC-AUTH-003 — Login wrong password
| Field | Value |
|-------|-------|
| Area | Auth |
| Actor | Customer |
| Steps | 1. `POST /auth/login` with wrong password |
| Expected | `401` / unauthorized; no tokens |

### TC-AUTH-004 — Refresh token
| Field | Value |
|-------|-------|
| Area | Auth |
| Actor | Customer |
| Preconditions | Valid refresh token from login |
| Steps | 1. `POST /auth/refresh` with `{ refreshToken }` |
| Expected | New access token issued |

### TC-AUTH-005 — Storefront login UI
| Field | Value |
|-------|-------|
| Area | Auth / Frontend |
| Actor | Customer |
| Steps | 1. Open `/account` 2. Enter customer credentials 3. Submit Sign in |
| Expected | Success message; token stored; account state shows signed in |

### TC-AUTH-006 — Storefront register UI
| Field | Value |
|-------|-------|
| Area | Auth / Frontend |
| Actor | Guest |
| Steps | 1. Open `/account` 2. Switch to Create account 3. Register `tc-user-@example.com` |
| Expected | Account created or clear validation error |

### TC-AUTH-007 — Forgot password (expected flow)
| Field | Value |
|-------|-------|
| Area | Auth / Frontend |
| Actor | Customer |
| Steps | 1. Look for Forgot password link on storefront account/login 2. Request reset for `customer@demo.local` 3. Confirm email/token reset endpoint |
| Expected | Reset request accepted and password can be changed |
| Note | Document as NOT_IMPLEMENTED if no UI route and no `POST /auth/forgot-password` (or similar) exists |

### TC-AUTH-008 — Admin UI login
| Field | Value |
|-------|-------|
| Area | Auth / Frontend |
| Actor | Admin |
| Steps | 1. Open admin `/login` 2. Sign in as admin |
| Expected | Redirect to admin dashboard |

---

## 4. Guest cart

### TC-CART-001 — Guest get/create cart
| Field | Value |
|-------|-------|
| Area | Cart |
| Actor | Guest |
| Steps | 1. `GET /cart?sessionId=tc-guest-session-1` with tenant header, no auth |
| Expected | Cart created/returned with `id` and empty or existing items |

### TC-CART-002 — Guest add product to cart
| Field | Value |
|-------|-------|
| Area | Cart |
| Actor | Guest |
| Preconditions | Public product variant id (e.g. Aurora headphones) |
| Steps | 1. Create guest cart 2. `POST /cart/:cartId/items` with `{ variantId, quantity: 1 }` |
| Expected | Cart contains line item; subtotal > 0 |

### TC-CART-003 — Guest update cart item quantity
| Field | Value |
|-------|-------|
| Area | Cart |
| Actor | Guest |
| Preconditions | TC-CART-002 |
| Steps | 1. `PATCH /cart/:cartId/items/:itemId` with `{ quantity: 3 }` |
| Expected | Quantity is 3; line total updated |

### TC-CART-004 — Guest remove cart item
| Field | Value |
|-------|-------|
| Area | Cart |
| Actor | Guest |
| Steps | 1. `DELETE /cart/:cartId/items/:itemId` |
| Expected | Item removed; cart empty or remaining items only |

### TC-CART-005 — Storefront guest add-to-cart UI
| Field | Value |
|-------|-------|
| Area | Cart / Frontend |
| Actor | Guest (incognito / logged out) |
| Steps | 1. Open `/products` 2. Open a product 3. Add to cart 4. Open `/cart` |
| Expected | Item visible in cart without login |

### TC-CART-006 — Merge guest cart after login
| Field | Value |
|-------|-------|
| Area | Cart |
| Actor | Customer |
| Preconditions | Guest cart with items; customer JWT |
| Steps | 1. `POST /cart/merge` with `{ sessionId }` and Bearer token |
| Expected | Guest items appear on user cart; guest cart cleaned up |

---

## 5. Checkout — QR payment + COD / cash

### TC-PAY-001 — Checkout with QR_UTR (API)
| Field | Value |
|-------|-------|
| Area | Checkout / Payments |
| Actor | Guest or Customer |
| Preconditions | Cart with items; tenant has `upiId` |
| Steps | 1. `POST /orders/checkout` with `cartId`, guest/shipping JSON, `paymentMethod: "QR_UTR"` (or omit for default) |
| Expected | Order `PENDING_PAYMENT`; payment object includes `qrCodeUrl` / `qrPayload` and `orderPaymentReference` |

### TC-PAY-002 — Submit UTR / transaction id
| Field | Value |
|-------|-------|
| Area | Checkout / Payments |
| Actor | Guest |
| Preconditions | TC-PAY-001 |
| Steps | 1. `POST /payments/verify-submit` with `orderPaymentReference`, `utr: "TCUTR123456"` |
| Expected | Payment marked awaiting verification / UTR stored |

### TC-PAY-003 — Admin confirm payment
| Field | Value |
|-------|-------|
| Area | Checkout / Payments |
| Actor | Admin |
| Preconditions | Pending UTR payment |
| Steps | 1. `GET /admin/payments/pending` 2. `POST /admin/payments/:id/confirm` |
| Expected | Payment confirmed; order advances |

### TC-PAY-004 — Checkout with CASH / COD (API)
| Field | Value |
|-------|-------|
| Area | Checkout / Payments |
| Actor | Guest |
| Preconditions | Cart with items |
| Steps | 1. `POST /orders/checkout` with `paymentMethod: "CASH"` |
| Expected | Order `CONFIRMED` (or paid-cash equivalent); no QR required |

### TC-PAY-005 — Storefront checkout shows QR
| Field | Value |
|-------|-------|
| Area | Checkout / Frontend |
| Actor | Guest |
| Steps | 1. Add item 2. Go to `/checkout` 3. Fill delivery 4. Place order |
| Expected | QR image / UPI pay UI shown; UTR submit form available |

### TC-PAY-006 — Cart page payment box (QR + COD)
| Field | Value |
|-------|-------|
| Area | Checkout / Frontend |
| Actor | Guest |
| Steps | 1. Open `/cart` with items 2. Look for QR next to cart summary and COD option |
| Expected | QR payment box beside cart and ability to choose COD or enter transaction id |
| Note | Mark NOT_IMPLEMENTED / FAIL if cart has no payment box and only `/checkout` supports QR |

### TC-PAY-007 — Storefront COD choice
| Field | Value |
|-------|-------|
| Area | Checkout / Frontend |
| Actor | Guest |
| Steps | 1. On checkout, select COD / cash and place order |
| Expected | Order placed without QR/UTR |
| Note | Mark NOT_IMPLEMENTED if UI has no COD control |

---

## 6. Marketing — coupons, gift cards, rewards

### TC-MKT-001 — Create coupon
| Field | Value |
|-------|-------|
| Area | Coupons |
| Actor | Admin |
| Steps | 1. `POST /admin/marketing/coupons` with code `TC-SAVE10`, type percent/fixed, value `10` |
| Expected | Coupon created |

### TC-MKT-002 — List / update / delete coupon
| Field | Value |
|-------|-------|
| Area | Coupons |
| Actor | Admin |
| Steps | 1. `GET /admin/marketing/coupons` 2. `PATCH /admin/marketing/coupons/:id` 3. `DELETE` disposable coupon |
| Expected | CRUD succeeds |

### TC-MKT-003 — Apply coupon to cart
| Field | Value |
|-------|-------|
| Area | Coupons |
| Actor | Guest |
| Preconditions | Valid coupon; cart with items |
| Steps | 1. `POST /cart/:cartId/coupon` with `{ code: "TC-SAVE10" }` |
| Expected | Discount applied; totals reflect coupon |

### TC-MKT-004 — Invalid coupon rejected
| Field | Value |
|-------|-------|
| Area | Coupons |
| Actor | Guest |
| Steps | 1. Apply code `TC-INVALID-XYZ` |
| Expected | Error; cart totals unchanged |

### TC-MKT-005 — Create / list gift card
| Field | Value |
|-------|-------|
| Area | Gift cards |
| Actor | Admin |
| Steps | 1. `POST /admin/marketing/gift-cards` with amount `500` 2. `GET /admin/marketing/gift-cards` |
| Expected | Gift card created and listed |

### TC-MKT-006 — Loyalty earn / redeem (rewards)
| Field | Value |
|-------|-------|
| Area | Rewards |
| Actor | Customer / Admin |
| Steps | 1. Call loyalty earn endpoint 2. Redeem points on cart/order |
| Expected | Points balance updates; redeem reduces balance |
| Note | Mark NOT_IMPLEMENTED if only service methods exist with no HTTP routes |

---

## 7. All remaining backend modules

### TC-HLTH-001 — Health check
| Field | Value |
|-------|-------|
| Area | Health |
| Actor | Anyone |
| Steps | 1. `GET /health` |
| Expected | Healthy / ok response |

### TC-CAT-001 — Public product detail + categories
| Field | Value |
|-------|-------|
| Area | Catalog |
| Actor | Guest |
| Steps | 1. `GET /products/aurora-headphones` 2. `GET /categories` |
| Expected | Product detail and category list returned |

### TC-CAT-002 — Bundles and tags (public + admin create)
| Field | Value |
|-------|-------|
| Area | Catalog |
| Actor | Guest / Admin |
| Steps | 1. `GET /bundles` 2. `GET /tags` 3. Admin `POST /admin/tags` with `tc-tag` |
| Expected | Lists return; tag created |

### TC-INV-001 — Inventory warehouses and levels
| Field | Value |
|-------|-------|
| Area | Inventory |
| Actor | Admin |
| Steps | 1. `GET /admin/inventory/warehouses` 2. `GET /admin/inventory/levels` |
| Expected | Main warehouse and stock levels listed |

### TC-INV-002 — Inventory adjust
| Field | Value |
|-------|-------|
| Area | Inventory |
| Actor | Admin |
| Steps | 1. `POST /admin/inventory/adjust` with valid variant/warehouse delta |
| Expected | Level updated |

### TC-ORD-001 — List my orders (customer)
| Field | Value |
|-------|-------|
| Area | Orders |
| Actor | Customer |
| Steps | 1. `GET /orders/mine` with customer JWT |
| Expected | Array of customer orders |

### TC-ORD-002 — Admin list / status update
| Field | Value |
|-------|-------|
| Area | Orders |
| Actor | Admin |
| Steps | 1. `GET /admin/orders` 2. `PATCH /admin/orders/:id/status` with a valid status |
| Expected | Orders listed; status changes |

### TC-CUST-001 — Customer addresses CRUD
| Field | Value |
|-------|-------|
| Area | Customers |
| Actor | Customer |
| Steps | 1. `POST /me/addresses` 2. `GET /me/addresses` 3. `PATCH` then `DELETE` |
| Expected | Address lifecycle works |

### TC-CUST-002 — Admin customers list
| Field | Value |
|-------|-------|
| Area | Customers |
| Actor | Admin |
| Steps | 1. `GET /admin/customers` |
| Expected | Includes seeded customer |

### TC-REV-001 — Create and list reviews
| Field | Value |
|-------|-------|
| Area | Reviews |
| Actor | Customer / Guest |
| Steps | 1. `POST /reviews` for a product 2. `GET /reviews` |
| Expected | Review created (or pending); listable |

### TC-RET-001 — Create return request
| Field | Value |
|-------|-------|
| Area | Returns |
| Actor | Customer |
| Steps | 1. `POST /returns` for an eligible order item |
| Expected | Return created or clear eligibility error |

### TC-WISH-001 — Wishlist guest/user
| Field | Value |
|-------|-------|
| Area | Wishlists |
| Actor | Guest |
| Steps | 1. `POST /wishlists` with `guestUuid` 2. `POST /wishlists/:id/items` 3. `GET /wishlists?guestUuid=` |
| Expected | Wishlist holds product |

### TC-CMS-001 — Public CMS pages / homepage / FAQs
| Field | Value |
|-------|-------|
| Area | CMS |
| Actor | Guest |
| Steps | 1. `GET /pages/about` 2. `GET /homepage` 3. `GET /faqs` |
| Expected | Content returned |

### TC-SET-001 — Settings get / shipping rates
| Field | Value |
|-------|-------|
| Area | Settings |
| Actor | Admin / Guest |
| Steps | 1. `GET /admin/settings` 2. `GET /shipping/rates` (or settings shipping rates route) |
| Expected | Settings include currency/UPI; rates available |

### TC-AN-001 — Analytics track + admin dashboard
| Field | Value |
|-------|-------|
| Area | Analytics |
| Actor | Guest / Admin |
| Steps | 1. `POST /analytics/track` 2. `GET /admin/analytics/dashboard` |
| Expected | Event accepted; dashboard data returned |

### TC-STAFF-001 — List staff and roles
| Field | Value |
|-------|-------|
| Area | Staff |
| Actor | Admin |
| Steps | 1. `GET /admin/staff` 2. `GET /admin/staff/roles` |
| Expected | Staff/roles returned |

### TC-SUB-001 — Subscription plans list / create
| Field | Value |
|-------|-------|
| Area | Subscriptions |
| Actor | Guest / Admin |
| Steps | 1. `GET /subscription-plans` 2. Admin create plan if needed |
| Expected | Plans list works |

### TC-B2B-001 — Companies and quotes list
| Field | Value |
|-------|-------|
| Area | B2B |
| Actor | Admin |
| Steps | 1. `GET /admin/b2b/companies` 2. `GET /admin/b2b/quotes` |
| Expected | Lists return (may be empty) |

### TC-MKTPLACE-001 — Vendors list
| Field | Value |
|-------|-------|
| Area | Marketplace |
| Actor | Admin |
| Steps | 1. `GET /admin/marketplace/vendors` |
| Expected | Vendors array |

### TC-DRV-001 — Driver jobs / online
| Field | Value |
|-------|-------|
| Area | Driver |
| Actor | Driver |
| Steps | 1. Login as driver 2. `POST /driver/online` 3. `GET /driver/jobs` |
| Expected | Online ok; jobs list returned |

### TC-WH-001 — Webhooks list
| Field | Value |
|-------|-------|
| Area | Webhooks |
| Actor | Admin |
| Steps | 1. `GET /admin/webhooks` |
| Expected | Endpoints list |

### TC-BILL-001 — Invoice generation
| Field | Value |
|-------|-------|
| Area | Billing |
| Actor | Admin |
| Preconditions | Existing order id |
| Steps | 1. `POST /admin/billing/orders/:orderId/invoice` |
| Expected | Invoice created or returned |

### TC-MEDIA-001 — Media list / upload
| Field | Value |
|-------|-------|
| Area | Media |
| Actor | Admin |
| Steps | 1. `GET /admin/media` 2. Optionally `POST /admin/media` with file |
| Expected | List works; upload succeeds if storage configured |

### TC-PROV-001 — Providers and requirements
| Field | Value |
|-------|-------|
| Area | Providers |
| Actor | Admin |
| Steps | 1. `GET /admin/providers` 2. `GET /admin/requirements` |
| Expected | Lists return |

### TC-PLAT-001 — Platform brands
| Field | Value |
|-------|-------|
| Area | Platform |
| Actor | Super/platform admin if available |
| Steps | 1. `GET /admin/platform/brands` |
| Expected | Brands listed or auth rejection documented |

### TC-SEC-001 — Protected admin route without token
| Field | Value |
|-------|-------|
| Area | Security |
| Actor | Unauthenticated |
| Steps | 1. `GET /admin/orders` without Authorization |
| Expected | `401` / `403`

---

## Execution checklist summary

| ID | Title |
|----|-------|
| TC-PROD-001..009 | Product CRUD, bulk, validation, public catalog |
| TC-ATTR-001..005 | Attributes CRUD + attach |
| TC-AUTH-001..008 | Login, refresh, storefront/admin UI, forgot password |
| TC-CART-001..006 | Guest cart API + UI + merge |
| TC-PAY-001..007 | QR checkout, UTR, confirm, COD, cart payment box |
| TC-MKT-001..006 | Coupons, gift cards, loyalty |
| TC-HLTH / CAT / INV / ORD / CUST / REV / RET / WISH / CMS / SET / AN / STAFF / SUB / B2B / MKTPLACE / DRV / WH / BILL / MEDIA / PROV / PLAT / SEC | Remaining backend modules |

Results are recorded in [test-report.md](./test-report.md).
