import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'LedgerStore | OmniCommerce',
  description: 'Headless commerce storefront for OmniCommerce — midnight & gold.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell inner">
            <Link href="/" className="brand">
              Ledger<span>Store</span>
            </Link>
            <nav className="nav" aria-label="Primary">
              <Link href="/">Home</Link>
              <Link href="/products">Products</Link>
              <Link href="/cart">Cart</Link>
              <Link href="/checkout">Checkout</Link>
              <Link href="/account">Account</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="shell">
            LedgerStore · powered by OmniCommerce · QR / UTR payments
          </div>
        </footer>
      </body>
    </html>
  );
}
