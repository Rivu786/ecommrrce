'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@/components/DataTable';
import { ApiError, api, formatMoney } from '@/lib/api';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  channel?: string;
  grandTotal: number;
  subtotal?: number;
  taxTotal?: number;
  shippingTotal?: number;
  discountTotal?: number;
  items?: { productName: string; sku: string; quantity: number; lineTotal: number }[];
  payment?: { status: string; method?: string; utr?: string; payerBankName?: string };
};

const ACTIONS = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function OrderDetailPage() {
  const params = useParams();
  const id = String(params.id || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api<Order>(`/admin/orders/${id}`);
      setOrder(data);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function setStatus(status: string) {
    setMsg(null);
    try {
      const updated = await api<Order>(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrder(updated);
      setMsg(`Status → ${status}`);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Update failed');
    }
  }

  async function makeDoc(kind: 'invoice' | 'receipt') {
    try {
      const doc = await api<{ pdfUrl?: string }>(`/admin/billing/orders/${id}/${kind}`, { method: 'POST' });
      setMsg(`${kind} ready: ${doc.pdfUrl || 'created'}`);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : `Failed ${kind}`);
    }
  }

  if (loading) return <div className="state-box">Loading…</div>;
  if (!order) return <div className="state-box error">{msg || 'Order not found'}</div>;

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={order.channel || 'ONLINE'}
        actions={
          <Link href="/orders" className="btn btn-sm">
            Back
          </Link>
        }
      />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}

      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="label">Status</div>
          <div className="value"><StatusBadge status={order.status} /></div>
        </div>
        <div className="kpi-card">
          <div className="label">Total</div>
          <div className="value gold">{formatMoney(order.grandTotal)}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Payment</div>
          <div className="value" style={{ fontSize: 14 }}>
            <StatusBadge status={order.payment?.status} /> {order.payment?.method}
          </div>
        </div>
      </div>

      <div className="panel stack" style={{ marginBottom: 16, maxWidth: 640 }}>
        <h2>Fulfillment</h2>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {ACTIONS.map((s) => (
            <button key={s} type="button" className="btn btn-sm" onClick={() => setStatus(s)} disabled={order.status === s}>
              {s}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-sm btn-gold" onClick={() => makeDoc('receipt')}>
            Receipt PDF
          </button>
          <button type="button" className="btn btn-sm" onClick={() => makeDoc('invoice')}>
            Invoice PDF
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Line items</h2>
        <ul className="stack">
          {(order.items || []).map((item, i) => (
            <li key={i}>
              {item.productName} ({item.sku}) × {item.quantity} — {formatMoney(item.lineTotal)}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>
          Subtotal {formatMoney(order.subtotal)} · Discount {formatMoney(order.discountTotal)} · Tax{' '}
          {formatMoney(order.taxTotal)} · Shipping {formatMoney(order.shippingTotal)}
        </p>
      </div>

      {order.payment?.utr ? (
        <div className="panel">
          <h2>UTR</h2>
          <p>
            {order.payment.utr} · {order.payment.payerBankName || '—'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
