'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAuthToken,
  getSessionId,
  storeApi,
  type Cart,
  type CheckoutResult,
} from '@/lib/api';

function money(n: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [order, setOrder] = useState<CheckoutResult | null>(null);
  const [utr, setUtr] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await storeApi.getCart(getSessionId(), getAuthToken());
        setCart(data);
        localStorage.setItem('omni_cart_id', data.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cart');
      }
    })();
  }, []);

  async function placeOrder() {
    if (!cart) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await storeApi.checkout(
        {
          cartId: cart.id,
          fulfillmentMode: 'HOME_DELIVERY',
          guestJson: { name, phone },
          shippingAddressJson: { line1: address, phone, name },
        },
        getAuthToken(),
      );
      setOrder(result);
      setStatus('Order created. Scan the QR and submit your UTR.');
      setCart({ ...cart, items: [], subtotal: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitUtr(e: React.FormEvent) {
    e.preventDefault();
    if (!order?.payment?.orderPaymentReference) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await storeApi.verifyPayment({
        orderPaymentReference: order.payment.orderPaymentReference,
        utr,
        senderAccount: senderAccount || undefined,
      });
      setStatus('UTR submitted for verification. We will confirm shortly.');
      setUtr('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'UTR submit failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell section">
      <h1 className="page-title">Checkout</h1>
      <p className="section-sub">Pay via UPI QR, then submit your UTR reference.</p>

      {error && <p className="error">{error}</p>}
      {status && <p className="ok">{status}</p>}

      {!order ? (
        <div className="split split-2">
          <div className="panel stack">
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Delivery</h2>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy || !cart || cart.items.length === 0}
              onClick={() => void placeOrder()}
            >
              {busy ? 'Placing order…' : 'Place order & show QR'}
            </button>
            {cart && cart.items.length === 0 && (
              <p className="muted">
                Cart is empty. <Link href="/products">Add products</Link> first.
              </p>
            )}
          </div>
          <div className="panel stack">
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Summary</h2>
            {!cart ? (
              <p className="muted">Loading…</p>
            ) : (
              <>
                {cart.items.map((item) => (
                  <div key={item.id} className="row">
                    <span>
                      {item.variant?.product?.name || item.variant?.sku} × {item.quantity}
                    </span>
                    <span>{money(Number(item.lineTotal), cart.currencyCode)}</span>
                  </div>
                ))}
                <div
                  className="row"
                  style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}
                >
                  <strong>Total</strong>
                  <strong>{money(Number(cart.subtotal), cart.currencyCode)}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="split split-2">
          <div className="panel stack">
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
              Order {order.orderNumber}
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              Pay {money(Number(order.grandTotal), order.currencyCode)} via UPI.
            </p>
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Ref: {order.payment?.orderPaymentReference}
            </p>
            <div className="qr-box">
              {order.payment?.qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.payment.qrCodeUrl} alt="UPI payment QR code" />
              ) : (
                <code>{order.payment?.qrPayload || 'QR unavailable'}</code>
              )}
              <span>Scan with any UPI app</span>
            </div>
          </div>
          <form className="panel stack" onSubmit={(e) => void submitUtr(e)}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Submit UTR</h2>
            <div className="field">
              <label htmlFor="utr">UTR / transaction ID</label>
              <input
                id="utr"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="12-digit bank reference"
              />
            </div>
            <div className="field">
              <label htmlFor="sender">Sender account (optional)</label>
              <input
                id="sender"
                value={senderAccount}
                onChange={(e) => setSenderAccount(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !utr.trim()}>
              {busy ? 'Submitting…' : 'Submit for verification'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
