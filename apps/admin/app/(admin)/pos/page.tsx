'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/DataTable';
import { ApiError, api, formatMoney } from '@/lib/api';

type Product = {
  id: string;
  name: string;
  variants?: { id: string; sku: string; price: number; name?: string }[];
};

export default function PosPage() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Product[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [sessionId] = useState(() => `pos-${crypto.randomUUID()}`);
  const [pay, setPay] = useState<'CASH' | 'QR_UTR'>('CASH');
  const [utr, setUtr] = useState('');
  const [bank, setBank] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);

  async function search() {
    const res = await api<{ data?: Product[]; items?: Product[] }>(
      `/products?q=${encodeURIComponent(q)}&take=10`,
    );
    setHits(res.data || res.items || []);
  }

  async function ensureCart() {
    if (cartId) return cartId;
    const cart = await api<{ id: string }>(`/cart?sessionId=${sessionId}`);
    setCartId(cart.id);
    return cart.id;
  }

  async function add(variantId: string) {
    const id = await ensureCart();
    await api(`/cart/${id}/items`, {
      method: 'POST',
      body: JSON.stringify({ variantId, quantity: 1 }),
    });
    setMsg('Added');
  }

  async function checkout() {
    const id = await ensureCart();
    try {
      const res = await api<Record<string, unknown>>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          cartId: id,
          paymentMethod: pay,
          channel: 'POS',
          fulfillmentMode: 'POS',
        }),
      });
      setOrder(res);
      if (pay === 'CASH') {
        await api(`/admin/billing/orders/${res.id}/receipt`, { method: 'POST' }).catch(() => null);
      }
      if (pay === 'QR_UTR' && utr) {
        const payment = res.payment as { orderPaymentReference?: string } | undefined;
        if (payment?.orderPaymentReference) {
          await api('/payments/verify-submit', {
            method: 'POST',
            body: JSON.stringify({
              orderPaymentReference: payment.orderPaymentReference,
              utr,
              payerBankName: bank,
            }),
          });
        }
      }
      setMsg('Order placed');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Checkout failed');
    }
  }

  return (
    <div>
      <PageHeader title="POS" description="Offline register — cash or QR. Receipt without invoice." />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU / name" />
        <button className="btn" type="button" onClick={search}>
          Search
        </button>
      </div>
      <ul className="stack">
        {hits.map((p) => (
          <li key={p.id} className="panel" style={{ padding: 12 }}>
            <strong>{p.name}</strong>
            {(p.variants || []).map((v) => (
              <div key={v.id} className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <span>
                  {v.sku} · {formatMoney(v.price)}
                </span>
                <button className="btn btn-sm btn-gold" type="button" onClick={() => add(v.id)}>
                  Add
                </button>
              </div>
            ))}
          </li>
        ))}
      </ul>
      <div className="panel stack" style={{ marginTop: 16, maxWidth: 360 }}>
        <label>
          <input type="radio" checked={pay === 'CASH'} onChange={() => setPay('CASH')} /> Cash
        </label>
        <label>
          <input type="radio" checked={pay === 'QR_UTR'} onChange={() => setPay('QR_UTR')} /> QR / UTR
        </label>
        {pay === 'QR_UTR' ? (
          <>
            <div className="field">
              <label>UTR</label>
              <input value={utr} onChange={(e) => setUtr(e.target.value)} />
            </div>
            <div className="field">
              <label>Payer bank name</label>
              <input value={bank} onChange={(e) => setBank(e.target.value)} />
            </div>
          </>
        ) : null}
        <button className="btn btn-primary" type="button" onClick={checkout}>
          Charge
        </button>
      </div>
      {order ? (
        <pre className="panel" style={{ marginTop: 12, fontSize: 12 }}>
          {JSON.stringify({ id: order.id, payment: order.payment }, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
