export const PERMISSION_KEYS = [
  'catalog.products.read',
  'catalog.products.write',
  'inventory.adjust',
  'orders.read',
  'orders.refund',
  'orders.write',
  'pos.charge_cash',
  'pos.receipt_only',
  'payments.verify_qr',
  'analytics.view',
  'staff.manage',
  'delivery.dispatch',
  'vendors.manage',
  'billing.invoice',
  'billing.receipt',
  'cms.write',
  'marketing.write',
  'settings.write',
  'platform.brands.write',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const BRAND_PERMISSION_KEYS = PERMISSION_KEYS.filter((k) => k !== 'platform.brands.write');

export const DEFAULT_BRAND_PACK: string[] = [...BRAND_PERMISSION_KEYS];
