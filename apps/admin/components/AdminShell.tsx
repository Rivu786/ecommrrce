'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearAuth, getStoredToken, getStoredTenant } from '@/lib/api';

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/', label: 'Dashboard' },
      { href: '/guide', label: 'Website guide' },
    ],
  },
  {
    title: 'Platform',
    items: [{ href: '/brands', label: 'Brands' }],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/products', label: 'Products' },
      { href: '/categories', label: 'Categories' },
      { href: '/attributes', label: 'Attributes' },
      { href: '/merchandising', label: 'Merchandising' },
      { href: '/inventory', label: 'Inventory' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/pos', label: 'POS' },
      { href: '/orders', label: 'Orders' },
      { href: '/payments', label: 'Payments' },
      { href: '/customers', label: 'Customers' },
      { href: '/promotions', label: 'Promotions' },
      { href: '/returns', label: 'Returns' },
    ],
  },
  {
    title: 'People',
    items: [{ href: '/staff', label: 'Staff & roles' }],
  },
  {
    title: 'Content',
    items: [
      { href: '/content', label: 'Content' },
      { href: '/reviews', label: 'Reviews' },
    ],
  },
  {
    title: 'Fulfillment',
    items: [
      { href: '/delivery', label: 'Delivery' },
      { href: '/drivers', label: 'Drivers' },
    ],
  },
  {
    title: 'Partners',
    items: [
      { href: '/vendors', label: 'Vendors' },
      { href: '/providers', label: 'Providers' },
      { href: '/requirements', label: 'Requirements' },
      { href: '/companies', label: 'Companies' },
      { href: '/subscriptions', label: 'Subscriptions' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/reports', label: 'Reports' },
      { href: '/settings', label: 'Settings' },
      { href: '/bulk', label: 'System' },
      { href: '/staff-note', label: 'Staff note' },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tenant, setTenant] = useState('demo');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setTenant(getStoredTenant());
    setReady(true);
  }, [router]);

  function logout() {
    clearAuth();
    router.replace('/login');
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
        Loading console…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          background: 'var(--midnight)',
          color: 'var(--text-inverse)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b',
        }}
      >
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>
            OmniCommerce
          </div>
          <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Midnight Ledger
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            Tenant <span style={{ color: 'var(--gold-soft)' }}>{tenant}</span>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0 16px' }}>
          {NAV.map((section) => (
            <div key={section.title} style={{ marginBottom: 10 }}>
              <div
                style={{
                  padding: '8px 14px 4px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                }}
              >
                {section.title}
              </div>
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'block',
                      padding: '6px 14px',
                      margin: '1px 8px',
                      borderRadius: 4,
                      fontSize: 12.5,
                      fontWeight: active ? 600 : 450,
                      color: active ? 'var(--midnight)' : '#cbd5e1',
                      background: active ? 'var(--gold)' : 'transparent',
                      borderLeft: active ? 'none' : '2px solid transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid #1e293b' }}>
          <button type="button" className="btn btn-sm" onClick={logout} style={{ width: '100%', background: '#1e293b', color: '#e2e8f0', borderColor: '#334155' }}>
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, background: 'var(--bg)' }}>
        <header
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Admin console</span>
          <span className="badge badge-gold">Live</span>
        </header>
        <div className="page-enter" style={{ padding: 18 }}>{children}</div>
      </main>
    </div>
  );
}
