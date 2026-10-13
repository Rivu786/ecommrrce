import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RoleCode, DEFAULT_BRAND_PACK } from '@omnicommerce/shared';

const prisma = new PrismaClient();

const ROLES = [
  { code: RoleCode.SUPER_ADMIN, name: 'Super Admin' },
  { code: RoleCode.TENANT_ADMIN, name: 'Tenant Admin' },
  { code: RoleCode.STORE_MANAGER, name: 'Store Manager' },
  { code: RoleCode.FULFILLMENT_CLERK, name: 'Fulfillment Clerk' },
  { code: RoleCode.PAYMENT_VERIFIER, name: 'Payment Verifier' },
  { code: RoleCode.DRIVER, name: 'Driver' },
  { code: RoleCode.VENDOR, name: 'Vendor' },
  { code: RoleCode.CUSTOMER, name: 'Customer' },
];

const PERMISSIONS = [
  'catalog:read',
  'catalog:write',
  'inventory:write',
  'orders:read',
  'orders:write',
  'payments:verify',
  'customers:read',
  'marketing:write',
  'cms:write',
  'analytics:read',
  'settings:write',
  'marketplace:write',
];

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p },
      update: {},
      create: { code: p, name: p },
    });
  }

  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: r,
    });
  }

  const allPerms = await prisma.permission.findMany();
  const tenantAdmin = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.TENANT_ADMIN } });
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: tenantAdmin.id, permissionId: perm.id } },
      update: {},
      create: { roleId: tenantAdmin.id, permissionId: perm.id },
    });
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  const superHash = await bcrypt.hash('super12345', 10);
  const customerHash = await bcrypt.hash('customer123', 10);
  const driverHash = await bcrypt.hash('driver123', 10);

  const superRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUPER_ADMIN } });
  const existingSuper = await prisma.user.findFirst({
    where: { email: 'super@omni.local', tenantId: null },
  });
  if (!existingSuper) {
    await prisma.user.create({
      data: {
        email: 'super@omni.local',
        passwordHash: superHash,
        fullName: 'Platform Super Admin',
        roles: { create: [{ roleId: superRole.id }] },
      },
    });
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'LedgerStore Demo',
      settings: {
        create: {
          primaryColor: '#0f172a',
          currencyCode: 'INR',
          locale: 'en-IN',
          timezone: 'Asia/Kolkata',
          upiId: 'ledgerstore@upi',
          bankAccountNumber: '1234567890',
          bankIfsc: 'HDFC0001234',
          bankBeneficiaryName: 'LedgerStore Demo',
          tenantBankReference: 'DEMO',
          deliveryRadiusKm: 15,
          lowStockThreshold: 5,
          taxRulesJson: { ratePct: 18, inclusive: false },
          corsOrigins: 'http://localhost:3000,http://localhost:3001',
        },
      },
      warehouses: {
        create: { name: 'Main Warehouse', code: 'MAIN' },
      },
    },
    include: { warehouses: true },
  });

  await prisma.tenantSettings.update({
    where: { tenantId: tenant.id },
    data: { taxRulesJson: { ratePct: 18, inclusive: false } },
  }).catch(() => undefined);

  await prisma.tenantPermissionPack.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, keysJson: DEFAULT_BRAND_PACK },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.TENANT_ADMIN } });
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.CUSTOMER } });
  const driverRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.DRIVER } });
  const verifierRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.PAYMENT_VERIFIER } });

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.local',
      passwordHash,
      fullName: 'Demo Admin',
      roles: {
        create: [{ roleId: adminRole.id }, { roleId: verifierRole.id }],
      },
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'customer@demo.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'customer@demo.local',
      passwordHash: customerHash,
      fullName: 'Demo Customer',
      phone: '+919876543210',
      roles: { create: [{ roleId: customerRole.id }] },
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'driver@demo.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'driver@demo.local',
      passwordHash: driverHash,
      fullName: 'Demo Driver',
      phone: '+919811122233',
      roles: { create: [{ roleId: driverRole.id }] },
    },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: driverUser.id,
      isOnline: true,
      vehicleInfo: 'Bike · KA-01-AB-1234',
    },
  });

  const category = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'electronics' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets and devices',
      sortOrder: 1,
    },
  });

  const colorAttr = await prisma.attribute.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'color' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'color',
      name: 'Color',
      type: 'select',
      values: {
        create: [
          { value: 'Black', sortOrder: 1 },
          { value: 'Silver', sortOrder: 2 },
        ],
      },
    },
  });

  const product = await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'aurora-headphones' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Aurora Wireless Headphones',
      slug: 'aurora-headphones',
      description: 'Premium noise-cancelling headphones with 30h battery.',
      sku: 'AURORA-HP',
      brand: 'Aurora',
      status: 'ACTIVE',
      metaTitle: 'Aurora Wireless Headphones',
      metaDescription: 'Shop Aurora wireless headphones',
      popularityScore: 100,
      categories: { create: [{ categoryId: category.id }] },
      variants: {
        create: [
          {
            tenantId: tenant.id,
            sku: 'AURORA-HP-BLK',
            name: 'Black',
            price: 4999,
            compareAtPrice: 5999,
            attributesJson: { color: 'Black' },
          },
          {
            tenantId: tenant.id,
            sku: 'AURORA-HP-SLV',
            name: 'Silver',
            price: 5199,
            attributesJson: { color: 'Silver' },
          },
        ],
      },
      images: {
        create: [
          {
            tenantId: tenant.id,
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
            alt: 'Aurora Headphones',
            sortOrder: 0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const warehouse = tenant.warehouses[0] ?? (await prisma.warehouse.findFirst({ where: { tenantId: tenant.id } }));
  if (warehouse) {
    for (const variant of product.variants) {
      await prisma.inventoryLevel.upsert({
        where: { warehouseId_variantId: { warehouseId: warehouse.id, variantId: variant.id } },
        update: { quantity: 50 },
        create: {
          tenantId: tenant.id,
          warehouseId: warehouse.id,
          variantId: variant.id,
          quantity: 50,
          reserved: 0,
        },
      });
    }
  }

  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WELCOME10' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minCartTotal: 1000,
      usageLimit: 1000,
      perUserLimit: 1,
      isActive: true,
    },
  });

  await prisma.homepageSection.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: 'hero',
        title: 'LedgerStore',
        sortOrder: 0,
        configJson: {
          headline: 'Commerce without gateways',
          subtitle: 'Pay via UPI QR. Verified by your merchant.',
          cta: 'Shop now',
          ctaHref: '/products',
        },
        isActive: true,
      },
      {
        tenantId: tenant.id,
        type: 'product_grid',
        title: 'Featured',
        sortOrder: 1,
        configJson: { limit: 8 },
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.cmsPage.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'about' } },
    update: {},
    create: {
      tenantId: tenant.id,
      title: 'About Us',
      slug: 'about',
      status: 'PUBLISHED',
      blocks: {
        create: [
          {
            type: 'rich_text',
            sortOrder: 0,
            contentJson: { html: '<p>LedgerStore is a headless commerce platform with QR/UTR payments.</p>' },
          },
        ],
      },
    },
  });

  const zoneCount = await prisma.shippingZone.count({ where: { tenantId: tenant.id } });
  if (!zoneCount) {
    await prisma.shippingZone.create({
      data: {
        tenantId: tenant.id,
        name: 'India Standard',
        countries: ['IN'],
        rates: {
          create: [
            { name: 'Standard', methodCode: 'standard', price: 49, etaHours: 72 },
            { name: 'Express', methodCode: 'express', price: 149, etaHours: 24 },
          ],
        },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  // eslint-disable-next-line no-console
  console.log({
    super: 'super@omni.local / super12345',
    tenant: tenant.slug,
    admin: 'admin@demo.local / admin123',
    customer: 'customer@demo.local / customer123',
    driver: 'driver@demo.local / driver123',
    attribute: colorAttr.code,
    adminId: admin.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
