"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import CartItemsList from "@/components/CartItemsList";
import CheckoutForm, { CheckoutFormData } from "@/components/CheckoutForm";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const handleCheckout = async (formData: CheckoutFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Errore nella creazione dell'ordine");
      }

      const order = await res.json();
      // Redirect to order confirmation
      router.push(`/shop/order-confirmation/${order.data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="mt-4 text-slate-600">Accedi per procedere con il checkout.</p>
          <a href="/auth/login" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors">
            Accedi
          </a>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="mt-4">Caricamento...</p>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="mt-4 text-slate-600">Il carrello è vuoto.</p>
          <a href="/shop" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Continua lo shopping
          </a>
        </main>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Carrello */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">Riepilogo Carrello</h2>
              <CartItemsList items={items} onRemove={async () => {}} onUpdateQty={async () => {}} />
            </div>
          </div>

          {/* Form e Total */}
          <div>
            {/* Total */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-slate-200">
              <h3 className="text-lg font-bold mb-4">Totale Ordine</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotale:</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spedizione:</span>
                  <span>Calcolata alla consegna</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Totale:</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Checkout Form */}
            <CheckoutForm onSubmit={handleCheckout} loading={submitting} />

            {/* Back Link */}
            <div className="mt-4">
              <a href="/shop/cart" className="text-blue-600 hover:underline text-sm">
                ← Torna al carrello
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
