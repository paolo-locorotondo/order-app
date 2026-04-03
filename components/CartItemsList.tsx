"use client";

import { useState } from "react";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

interface Props {
  items: CartItem[];
  onRemove: (itemId: string) => Promise<void>;
  onUpdateQty: (itemId: string, qty: number) => Promise<void>;
}

export default function CartItemsList({ items, onRemove, onUpdateQty }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleRemove = async (itemId: string) => {
    setLoading(itemId);
    try {
      await onRemove(itemId);
    } finally {
      setLoading(null);
    }
  };

  const handleQtyChange = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setLoading(itemId);
    try {
      await onUpdateQty(itemId, newQty);
    } finally {
      setLoading(null);
    }
  };

  if (items.length === 0) {
    return <p className="text-slate-600">Carrello vuoto</p>;
  }

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="rounded border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold">{item.product.name}</h3>
              <p className="text-sm text-slate-600">€{item.product.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                disabled={loading === item.id}
                className="w-16 rounded border p-1 text-center"
              />
              <p className="w-20 text-right font-semibold">€{(item.product.price * item.quantity).toFixed(2)}</p>
              <button
                onClick={() => handleRemove(item.id)}
                disabled={loading === item.id}
                className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:opacity-50"
              >
                Rimuovi
              </button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-end rounded border-t-2 pt-4">
        <div className="text-right">
          <p className="text-sm text-slate-600">Totale:</p>
          <p className="text-2xl font-bold">€{total.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
