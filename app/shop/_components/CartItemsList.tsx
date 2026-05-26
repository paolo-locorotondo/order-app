"use client";

import { useState } from "react";
import QuantityStepper from "@/components/QuantityStepper";
import { getProductImage } from "@/lib/product-image";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
    deliveryDate?: Date | string | null;
  };
  quantity: number;
}

interface Props {
  items: CartItem[];
  onRemove?: (itemId: string) => Promise<void>;
  onUpdateQty?: (itemId: string, qty: number) => Promise<void>;
  readOnly?: boolean;
}

export default function CartItemsList({ items, onRemove, onUpdateQty, readOnly = false }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleRemove = async (itemId: string) => {
    if (!onRemove) return;
    setLoading(itemId);
    try {
      await onRemove(itemId);
    } finally {
      setLoading(null);
    }
  };

  const handleQtyChange = async (itemId: string, newQty: number) => {
    if (!onUpdateQty || newQty < 1) return;
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
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:flex-1">
              <img
                src={getProductImage(item.product.image)}
                alt={item.product.name}
                className="h-14 w-14 flex-shrink-0 rounded border bg-slate-100 object-cover sm:h-16 sm:w-16"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{item.product.name}</h3>
                {item.product.deliveryDate && (
                  <p className="text-xs text-slate-500">
                    Consegna: {new Date(item.product.deliveryDate).toLocaleDateString("it-IT")}
                  </p>
                )}
                <p className="text-sm text-slate-600">€{item.product.price.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {readOnly ? (
                <span className="w-16 text-center text-sm text-slate-600">x{item.quantity}</span>
              ) : (
                <QuantityStepper
                  value={item.quantity}
                  onChange={(n) => handleQtyChange(item.id, n)}
                  min={1}
                  disabled={loading === item.id}
                  size="sm"
                />
              )}
              <p className="w-20 text-right font-semibold">€{(item.product.price * item.quantity).toFixed(2)}</p>
              {!readOnly && (
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={loading === item.id}
                  className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Rimuovi
                </button>
              )}
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
