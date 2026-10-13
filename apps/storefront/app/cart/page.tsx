'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  getAuthToken,
  getSessionId,
  storeApi,
  type Cart,
} from '@/lib/api';

function money(n: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const sessionId = getSessionId();
      const token = getAuthToken();
      const data = await storeApi.getCart(sessionId, token);
      setCart(data);
      localStorage.setItem('omni_cart_id', data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function updateQty(itemId: string, quantity: number) {
    if (!cart) return;
    setBusy(true);
    setError(null);
    try {
      if (quantity <= 0) {
        await storeApi.removeCartItem(cart.id, itemId);
      } else {
        await storeApi.updateCartItem(cart.id, itemId, quantity);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell section">
      <h1 className="page-title">Cart</h1>
      <p className="section-sub">Review items before QR checkout.</p>

      {error && <p className="error">{error}</p>}

      {!cart ? (
        <p className="muted">Loading cart…</p>
      ) : cart.items.length === 0 ? (
        <div className="panel stack">
          <p className="muted" style={{ margin: 0 }}>
            Your cart is empty.
          </p>
          <Link className="btn btn-primary" href="/products" style={{ width: 'fit-content' }}>
            Browse products
          </Link>
        </div>
      ) : (
        <div className="split split-2">
          <div className="panel">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item">
                <div>
                  <strong>{item.variant?.product?.name || item.variant?.name || item.variant?.sku}</strong>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {money(Number(item.unitPrice), cart.currencyCode)} · qty {item.quantity}
                  </div>
                </div>
                <div className="cta-row">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => void updateQty(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => void updateQty(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="panel stack">
            <div className="row">
              <span className="muted">Subtotal</span>
              <strong>{money(Number(cart.subtotal), cart.currencyCode)}</strong>
            </div>
            <Link className="btn btn-primary" href="/checkout">
              Proceed to checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
