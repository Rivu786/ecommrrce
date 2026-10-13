# OmniCommerce Production Feature Specification

## Core Philosophy
Every feature must be production-ready: validated, tested, accessible, performant, and scalable. No placeholder UIs.

---

## 1. CATALOG MANAGEMENT

### 1.1 Products
- **Create/Edit Product** (multi-step wizard or tabbed form):
  - Basic Info: name, slug, description (rich text), SKU, brand, status (DRAFT/ACTIVE/ARCHIVED)
  - Variants: multiple variants with attributes (size, color, etc.), individual SKUs, prices, compare-at prices, barcodes, images per variant
  - Attributes: assign attribute values (from global attributes) - used for filtering/facets
  - Addon Groups: required/optional groups (e.g., "Add gift wrap", "Choose sauce"), min/max selection
  - Images: drag-drop upload, reorder, alt text, variant-specific images
  - SEO: meta title, meta description, canonical URL, JSON-LD structured data
  - Inventory: track quantity, low stock threshold, allow backorder, prep time
  - Relations: cross-sells, up-sells, frequently bought together
  - Bundles: fixed-price bundles of multiple products
  - Visibility: channels (online, POS, marketplace), customer groups
  - Shipping: weight, dimensions, shipping class, free shipping flag

### 1.2 Categories
- Tree structure with drag-drop reordering
- Name, slug, description, image, sort order
- SEO fields per category
- Active/inactive toggle
- Product assignment (multi-select)

### 1.3 Attributes & Values
- Global attributes (Color, Size, Material, etc.)
- Types: text, select, multiselect, boolean, number, date
- Values with sort order
- Filterable/faceted search flags
- Display on product page / PLP flags

### 1.4 Tags
- Simple tagging for collections/promotions

### 1.5 Bundles
- Fixed price bundles
- Inventory tracked per component

---

## 2. INVENTORY MANAGEMENT

### 2.1 Warehouses
- CRUD: name, code, address, active status
- Default warehouse per tenant

### 2.2 Stock Levels
- Per variant per warehouse: quantity, reserved, available
- Low stock alerts (configurable threshold)
- Stock history/audit log

### 2.3 Adjustments
- Add/remove stock with reason codes (damage, return, count, write-off)
- Batch adjustments
- Approval workflow for large adjustments

### 2.4 Transfers
- Inter-warehouse transfers
- Status: pending, in-transit, received, cancelled
- Transfer receipts

### 2.5 Reservations
- Cart reservations (TTL configurable)
- Order reservations
- Auto-release on expiry

---

## 3. ORDER MANAGEMENT

### 3.1 Order List & Detail
- Filterable, searchable, paginated
- Status timeline: PENDING_PAYMENT → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
- Customer info, shipping/billing addresses, line items, totals
- Notes (customer + internal)

### 3.2 Order Actions
- Confirm/cancel
- Add internal notes
- Edit shipping address (before shipment)
- Partial fulfillment
- Refund/return initiation

### 3.3 Fulfillment
- Create shipments from order items
- Tracking numbers, carrier integration
- Print packing slips, shipping labels
- Delivery confirmation (POD photos, signatures)

### 3.4 Invoices & Receipts
- Auto-generate on payment confirmation
- PDF download/email
- GST/tax compliant (India)
- Credit notes for returns

### 3.5 Returns & Exchanges
- Customer-initiated return requests
- Admin approve/reject
- Refund to original payment / store credit
- Restock inventory

---

## 4. PAYMENTS

### 4.1 UPI QR + UTR Verification (Core)
- Generate UPI QR per order with amount, reference
- Customer submits UTR + screenshot
- Admin verification queue with approve/reject
- Auto-match UTR to bank statement (future)

### 4.2 Payment Methods
- COD
- UPI QR (current)
- Card/Netbanking (Razorpay/Stripe - future)
- Wallet/Store credit
- Gift cards

### 4.3 Payment Admin
- Pending verification queue
- Manual confirm/reject with audit trail
- Reconciliation reports

---

## 5. PROMOTIONS & MARKETING

### 5.1 Coupons
- Types: percent, fixed amount, free shipping, buy X get Y
- Rules: min cart value, specific products/categories, customer groups, usage limits
- Codes: auto-generate or custom
- Scheduling: start/end dates
- Stacking rules

### 5.2 Gift Cards
- Sell gift cards (digital/physical)
- Codes with balance tracking
- Expiry dates
- Partial redemption

### 5.3 Loyalty Program
- Points per purchase (configurable rate)
- Tiers (Silver/Gold/Platinum)
- Redeem points for discounts
- Points expiry

### 5.4 Campaigns
- Scheduled promotions
- A/B testing (future)

---

## 6. CUSTOMER MANAGEMENT

### 6.1 Customer List & Profiles
- Search, filter, segment
- Profile: orders, addresses, wishlists, loyalty, store credit, notes
- Impersonate login (for support)

### 6.2 Addresses
- Multiple shipping/billing addresses
- Default flags
- Validation (pincode lookup)

### 6.3 Customer Groups
- Wholesale, VIP, Staff, etc.
- Group-based pricing, promotions, catalog visibility

### 6.4 Communication
- Email/SMS templates (order confirmation, shipping, marketing)
- Notification log

---

## 7. CONTENT / CMS

### 7.1 Pages
- Visual builder (blocks: hero, product grid, banner, rich text, video, testimonial)
- SEO per page
- Publish scheduling
- Version history

### 7.2 Homepage Sections
- Drag-drop section ordering
- Section types: hero carousel, featured categories, product collections, banners, custom HTML

### 7.3 FAQs
- Per-product and global
- Categories, search

### 7.4 Blog/Articles (future)

---

## 8. SETTINGS (Comprehensive)

### 8.1 General
- Store name, logo, favicon, contact info
- Currency, locale, timezone
- Business hours
- Legal address, GSTIN

### 8.2 Payments
- UPI ID, bank details (for QR generation)
- Payment gateway credentials (encrypted)
- COD settings (fee, max amount, pincodes)
- Auto-capture vs manual

### 8.3 Shipping
- Zones (countries/states/pincodes)
- Rates: flat, weight-based, price-based, free threshold
- Methods: standard, express, pickup
- Carrier integrations (Shiprocket, Delhivery - future)

### 8.4 Tax
- GST rates per category (CGST/SGST/IGST)
- Tax-exempt products
- Inclusive vs exclusive pricing
- HSN codes

### 8.5 Notifications
- Email templates (transactional + marketing)
- SMS templates
- WhatsApp templates (future)
- Webhook endpoints

### 8.6 Integrations
- Analytics (GA4, Meta Pixel)
- ERP/Accounting (Tally, Zoho - future)
- Webhooks for order/events

### 8.7 SEO & Performance
- Robots.txt, sitemap.xml
- Meta defaults
- Image optimization settings

---

## 9. REPORTS & ANALYTICS

### 9.1 Dashboard KPIs
- Revenue, orders, AOV, conversion rate
- Real-time visitors
- Top products, categories

### 9.2 Sales Reports
- By date, product, category, channel, customer group
- Export CSV/Excel

### 9.3 Inventory Reports
- Stock levels, low stock, dead stock
- Turnover rate

### 9.4 Customer Reports
- New vs returning, LTV, cohorts
- RFM analysis

### 9.5 Financial
- Tax reports (GSTR-1 ready)
- Payout reports (vendors, drivers)

---

## 10. STAFF & ROLES (RBAC)

### 10.1 Roles & Permissions
- Predefined: Super Admin, Brand Admin, Store Manager, Fulfillment Clerk, Payment Verifier, Support, Content Editor
- Custom roles with granular permissions
- Permission categories: catalog, orders, customers, inventory, payments, content, settings, reports

### 10.2 Staff Management
- Invite staff, assign roles, tenant access
- Activity log
- 2FA enforcement

---

## 11. FULFILLMENT & DELIVERY

### 11.1 Driver App (Flutter)
- Login, go online/offline
- Assigned jobs list
- Navigation to pickup/delivery
- Capture POD: photo, signature, OTP
- Earnings tracking

### 11.2 Dispatch Dashboard
- Auto-assign / manual assign
- Route optimization (future)
- Live tracking
- SLA monitoring

### 11.3 Shipping Zones & Rates
- Coverage by pincode
- Delivery time estimates
- Driver commission settings

---

## 12. MARKETPLACE / VENDORS

### 12.1 Vendor Onboarding
- Application with KYC docs
- Approval workflow
- Commission agreements

### 12.2 Vendor Portal
- Product management (own products only)
- Order management (own orders)
- Payout requests
- Performance metrics

### 12.3 Admin Vendor Management
- KYC review
- Commission adjustments
- Payout processing
- Suspend/ban

---

## 13. B2B / WHOLESALE

### 13.1 Companies
- Company profiles with credit limits
- Multiple buyers per company
- Custom price lists

### 13.2 Quotes
- Create quotes from cart
- Negotiation workflow
- Convert to order

### 13.3 Price Lists
- Per-company or per-group
- Rules: percentage off, fixed prices, tiered pricing

---

## 14. SUBSCRIPTIONS

### 14.1 Plans
- Products with recurring billing
- Intervals: weekly, monthly, quarterly
- Trial periods

### 14.2 Subscriptions
- Customer self-service (pause, cancel, change plan)
- Auto-renewal with payment retry
- Dunning management

---

## 15. STOREFRONT (Customer-Facing)

### 15.1 Homepage
- CMS-driven sections
- Featured collections, banners, promos

### 15.2 Product Listing (PLP)
- Faceted search (attributes, price, category, brand)
- Sort: relevance, price, newest, rating
- Infinite scroll / pagination
- Quick view

### 15.3 Product Detail (PDP)
- Image gallery with zoom
- Variant selection (visual swatches for color/size)
- Addon groups
- Quantity selector with stock indicator
- Reviews, FAQs, related products
- Add to cart / Buy now
- Wishlist, compare

### 15.4 Cart
- Persistent (guest + logged in)
- Variant changes, quantity updates
- Addon selection
- Coupon application
- Shipping estimator
- Save for later

### 15.5 Checkout
- Guest / login / register
- Address book
- Shipping method selection
- Payment: UPI QR + UTR submit, COD, wallet
- Order summary with tax breakdown
- Terms acceptance

### 15.6 Account
- Order history with status tracking
- Download invoices
- Return requests
- Wishlists (multiple, shareable)
- Addresses
- Loyalty points
- Store credit
- Subscriptions management

---

## 16. TECHNICAL REQUIREMENTS

### 16.1 Performance
- API response < 200ms p95
- Storefront LCP < 2.5s
- ISR/SSG for catalog pages
- Redis caching for hot data

### 16.2 Security
- JWT access + refresh tokens
- Rate limiting per endpoint
- Input validation (Zod)
- SQL injection prevention (Prisma)
- XSS prevention
- CORS configuration
- Audit logging all admin actions

### 16.3 Observability
- Structured logging (JSON)
- Metrics (Prometheus)
- Traces (OpenTelemetry)
- Error tracking (Sentry)

### 16.4 Multi-tenancy
- Row-level security via tenant_id
- Tenant isolation in all queries
- Super-admin cross-tenant access

### 16.5 Deployment
- Docker images for all services
- CI/CD pipelines
- Database migrations
- Zero-downtime deployments

---

## IMPLEMENTATION PRIORITY (Phased)

### Phase 1 - Core Commerce (Weeks 1-3)
1. Product CRUD with variants, attributes, addons, images
2. Category tree management
3. Inventory: warehouses, stock levels, adjustments
4. Orders: list, detail, status transitions, fulfillment
5. Payments: UPI QR verification flow
6. Settings: general, payments, shipping, tax
7. Storefront: PLP, PDP, Cart, Checkout, Account

### Phase 2 - Marketing & Growth (Weeks 4-5)
8. Coupons, Gift Cards, Loyalty
9. Customer management, groups
10. CMS: pages, homepage sections
11. Reports dashboard

### Phase 3 - Operations & Scale (Weeks 6-7)
12. Staff & RBAC
13. Delivery/Driver management
14. Vendor marketplace
15. B2B: Companies, Quotes, Price Lists
16. Subscriptions

### Phase 4 - Polish & Harden (Week 8)
17. Performance optimization
18. Security audit
19. Load testing
20. Documentation