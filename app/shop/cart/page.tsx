"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import CartItemsList from "@/components/CartItemsList";
import { useSession } from "next-auth/react";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

export default function CartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetchCart();
  }, [status]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("Errore nel caricamento carrello");
      const data = await res.json();
      setItems(data.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart?id=${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore nella rimozione");
      setItems(items.filter((item) => item.id !== itemId));
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
      setItems(items.map((item) => (item.id === itemId ? updated.data : item)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCheckout = () => {
    router.push("/shop/checkout");
  };

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Carrello</h1>
          <p className="mt-4 text-slate-600">Accedi per visualizzare il carrello.</p>
          <Link href="/auth/login" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors">
            Accedi
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Carrello</h1>

        {error && <p className="mt-4 text-red-600">{error}</p>}

        {loading ? (
          <p className="mt-4">Caricamento...</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CartItemsList
                items={items}
                onRemove={handleRemove}
                onUpdateQty={handleUpdateQty}
              />
            </div>
            <aside className="rounded border bg-white p-4 shadow-sm h-fit">
              <h2 className="font-bold mb-4">Riepilogo</h2>
              <p className="text-sm text-slate-600 mb-4">
                {items.length} prodott{items.length !== 1 ? "i" : "o"}
              </p>
              <div className="border-t pt-4">
                <p className="text-lg font-bold mb-4">
                  Totale: €{items.reduce((sum, item) => {
                    return sum + (item.product?.price ?? 0) * item.quantity;
                  }, 0).toFixed(2)}
                </p>
                <button
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className="w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Procedi al checkout
                </button>
              </div>
            </aside>
          </div>
        )}

        <div className="mt-6">
          <Link href="/shop" className="text-blue-600 hover:underline">
            ← Continua lo shopping
          </Link>
        </div>
      </main>
    </div>
  );
}
