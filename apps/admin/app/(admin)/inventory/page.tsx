'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DataTable, PageHeader, StatusBadge } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

type Warehouse = { id: string; name: string; code: string };
type Po = { id: string; number: string; status: string; warehouseId: string };

export default function InventoryPage() {
  const { rows, loading, error, reload } = useApiList('/admin/inventory/levels');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [pos, setPos] = useState<Po[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [delta, setDelta] = useState('1');
  const [reason, setReason] = useState('manual adjust');
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [transferQty, setTransferQty] = useState('1');
  const [poVariantId, setPoVariantId] = useState('');
  const [poQty, setPoQty] = useState('10');
  const [msg, setMsg] = useState<string | null>(null);

  async function refreshExtras() {
    const [wh, purchaseOrders] = await Promise.all([
      api<Warehouse[]>('/admin/inventory/warehouses'),
      api<Po[]>('/admin/inventory/purchase-orders'),
    ]);
    setWarehouses(wh || []);
    setPos(purchaseOrders || []);
    if (!warehouseId && wh?.[0]) setWarehouseId(wh[0].id);
    if (!fromWh && wh?.[0]) setFromWh(wh[0].id);
    if (!toWh && wh?.[1]) setToWh(wh[1].id);
  }

  useEffect(() => {
    void refreshExtras().catch(() => undefined);
  }, []);

  async function onAdjust(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId,
          variantId,
          delta: Number(delta),
          reason,
        }),
      });
      setMsg('Adjusted');
      reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Adjust failed');
    }
  }

  async function onTransfer(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/admin/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify({
          fromWarehouseId: fromWh,
          toWarehouseId: toWh,
          variantId,
          quantity: Number(transferQty),
        }),
      });
      setMsg('Transferred');
      reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Transfer failed');
    }
  }

  async function onCreatePo(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/admin/inventory/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId,
          items: [{ variantId: poVariantId || variantId, quantity: Number(poQty) }],
          notes: 'Inbound stock',
        }),
      });
      setMsg('PO created');
      await refreshExtras();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'PO failed');
    }
  }

  async function receivePo(id: string) {
    try {
      await api(`/admin/inventory/purchase-orders/${id}/receive`, { method: 'POST' });
      setMsg('PO received into stock');
      await refreshExtras();
      reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Receive failed');
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, adjust, transfer, inbound PO"
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}

      <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
        <form className="panel stack" onSubmit={onAdjust} style={{ minWidth: 280 }}>
          <h2>Adjust</h2>
          <div className="field">
            <label>Warehouse</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Variant ID</label>
            <input value={variantId} onChange={(e) => setVariantId(e.target.value)} required />
          </div>
          <div className="field">
            <label>Delta (+/-)</label>
            <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} required />
          </div>
          <div className="field">
            <label>Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">Adjust</button>
        </form>

        <form className="panel stack" onSubmit={onTransfer} style={{ minWidth: 280 }}>
          <h2>Transfer</h2>
          <div className="field">
            <label>From</label>
            <select value={fromWh} onChange={(e) => setFromWh(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>To</label>
            <select value={toWh} onChange={(e) => setToWh(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Variant ID</label>
            <input value={variantId} onChange={(e) => setVariantId(e.target.value)} required />
          </div>
          <div className="field">
            <label>Qty</label>
            <input type="number" min={1} value={transferQty} onChange={(e) => setTransferQty(e.target.value)} />
          </div>
          <button className="btn" type="submit">Transfer</button>
        </form>

        <form className="panel stack" onSubmit={onCreatePo} style={{ minWidth: 280 }}>
          <h2>Inbound PO</h2>
          <div className="field">
            <label>Warehouse</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Variant ID</label>
            <input value={poVariantId || variantId} onChange={(e) => setPoVariantId(e.target.value)} required />
          </div>
          <div className="field">
            <label>Qty</label>
            <input type="number" min={1} value={poQty} onChange={(e) => setPoQty(e.target.value)} />
          </div>
          <button className="btn btn-gold" type="submit">Create PO</button>
        </form>
      </div>

      {pos.length ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2>Purchase orders</h2>
          <ul className="stack">
            {pos.map((p) => (
              <li key={p.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>
                  {p.number} · <StatusBadge status={p.status} />
                </span>
                {p.status !== 'RECEIVED' ? (
                  <button type="button" className="btn btn-sm" onClick={() => receivePo(p.id)}>
                    Receive
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No inventory levels."
        columns={[
          {
            key: 'sku',
            header: 'SKU',
            get: (row) => row.sku ?? row.variant?.sku ?? row.variantId,
          },
          {
            key: 'warehouse',
            header: 'Warehouse',
            get: (row) => row.warehouse?.name ?? row.warehouse?.code ?? row.warehouseId,
          },
          { key: 'quantity', header: 'Qty' },
          { key: 'reserved', header: 'Reserved', get: (row) => row.reserved ?? row.reservedQuantity },
          {
            key: 'status',
            header: 'Status',
            render: (row) => {
              const qty = Number(row.quantity ?? 0);
              return <StatusBadge status={qty <= 5 ? 'LOW' : 'OK'} />;
            },
          },
        ]}
      />
    </div>
  );
}
