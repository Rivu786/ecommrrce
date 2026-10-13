# Permission matrix

Platform Super Admin (`super@omni.local`) can grant a **pack** of these keys to a brand. Brand Admin may assign **subsets** to staff.

| Key | Meaning |
|-----|---------|
| catalog.products.read | View catalog |
| catalog.products.write | Edit products |
| inventory.adjust | Stock adjust/transfer |
| orders.read | View orders |
| orders.write | Update orders |
| orders.refund | Returns / refunds |
| pos.charge_cash | POS cash |
| pos.receipt_only | Receipt without invoice |
| payments.verify_qr | Confirm/reject UTR |
| analytics.view | Dashboards |
| staff.manage | Create staff/roles |
| delivery.dispatch | Delivery jobs |
| vendors.manage | Vendors + providers + RFQ |
| billing.invoice | GST invoice PDF |
| billing.receipt | Simple receipt PDF |
| cms.write | CMS |
| marketing.write | Coupons |
| settings.write | Brand settings |
| platform.brands.write | Super Admin only |

Any website: `X-Tenant-ID` + `/api/v1` (see OpenAPI `/api/docs`).
