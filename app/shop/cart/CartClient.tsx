"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CartItemsList from "@/components/CartItemsList";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

export default function CartClient({ initialItems }: { initialItems: CartItem[] }) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRemove = async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart?id=${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore nella rimozione");
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUpdateQty = async (itemId: string, qty: number) => {
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, quantity: qty }),
      });
      if (!res.ok) throw new Error("Errore nell'aggiornamento");
      const updated = await res.json();
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? updated.data : item))
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCheckout = () => {
    router.push("/shop/checkout");
  };

  return (
    <div className="mt-6">
      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CartItemsList
            items={items}
            onRemove={handleRemove}
            onUpdateQty={handleUpdateQty}
          />
        </div>

        <aside className="h-fit rounded border bg-white p-4 shadow-sm">
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
