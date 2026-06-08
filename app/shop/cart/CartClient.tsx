"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CartItemsList from "../_components/CartItemsList";
import { notifyCartChanged } from "@/lib/cart-events";
import { apiFetch } from "@/lib/fetch";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image: string | null;
    deliveryDate: Date | string | null;
  };
  quantity: number;
}

export default function CartClient({
  initialItems,
  noticeMessage,
}: {
  initialItems: CartItem[];
  noticeMessage?: string;
}) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  // Errori per-item (mappa itemId → messaggio): permette di mostrarli inline
  // sotto la card del prodotto interessato e di pulirli al primo successo su
  // quello stesso item, senza affettare gli altri.
  const [itemErrors, setItemErrors] = useState<Map<string, string>>(() => new Map());
  const router = useRouter();

  const setItemError = (itemId: string, msg: string) =>
    setItemErrors((prev) => new Map(prev).set(itemId, msg));
  const clearItemError = (itemId: string) =>
    setItemErrors((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });

  // Legge il messaggio di errore dal body server quando disponibile (es. la
  // guard "prodotto archiviato" del PATCH ritorna 410 con .error specifico),
  // altrimenti fallback al testo generico passato dal caller.
  const extractServerError = async (res: Response, fallback: string): Promise<string> => {
    try {
      const data = await res.json();
      if (typeof data?.error === "string") return data.error;
      if (data?.error) return JSON.stringify(data.error);
    } catch {
      // body non JSON o vuoto → fallback
    }
    return fallback;
  };

  const handleRemove = async (itemId: string) => {
    try {
      const res = await apiFetch(`/api/cart?id=${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await extractServerError(res, "Errore nella rimozione"));
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      clearItemError(itemId);
      notifyCartChanged();
    } catch (err) {
      setItemError(itemId, (err as Error).message);
    }
  };

  const handleUpdateQty = async (itemId: string, qty: number) => {
    try {
      const res = await apiFetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, quantity: qty }),
      });
      if (!res.ok) throw new Error(await extractServerError(res, "Errore nell'aggiornamento"));
      const updated = await res.json();
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? updated.data : item))
      );
      clearItemError(itemId);
      notifyCartChanged();
    } catch (err) {
      setItemError(itemId, (err as Error).message);
    }
  };

  const handleCheckout = () => {
    router.push("/shop/checkout");
  };

  return (
    <div className="mt-6">
      {noticeMessage && (
        <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-blue-700">
          {noticeMessage}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <CartItemsList
            items={items}
            onRemove={handleRemove}
            onUpdateQty={handleUpdateQty}
            itemErrors={itemErrors}
          />
        </div>

        <aside className="h-fit min-w-0 rounded border bg-white p-4 shadow-sm">
          <h2 className="mb-4 font-bold">Riepilogo</h2>
          <p className="mb-4 text-sm text-slate-600">
            {items.length} prodott{items.length !== 1 ? "i" : "o"}
          </p>
          <div className="border-t pt-4">
            <p className="mb-4 text-lg font-bold">
              Totale: €{items
                .reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0)
                .toFixed(2)}
            </p>
            <button
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              Procedi al checkout
            </button>
          </div>
        </aside>
      </div>

      <div className="mt-6">
        <Link href="/shop" className="text-blue-600 hover:underline">
          ← Continua lo shopping
        </Link>
      </div>
    </div>
  );
}
