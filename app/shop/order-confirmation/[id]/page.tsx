"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Header from "@/components/Header";

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  total: number;
  status: string;
  address: string;
  paymentMethod: string;
  items: OrderItem[];
  createdAt: string;
}

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { status } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (!orderId || status !== "authenticated") return;

    fetchOrder();
  }, [orderId, status]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Ordine non trovato");
      const data = await res.json();
      setOrder(data.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Conferma Ordine</h1>
          <p className="mt-4 text-slate-600">Accedi per visualizzare l'ordine.</p>
          <Link href="/auth/login" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Accedi
          </Link>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Conferma Ordine</h1>
          <p className="mt-4">Caricamento...</p>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Errore</h1>
          <p className="mt-4 text-red-600">{error || "Ordine non trovato"}</p>
          <Link href="/shop" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Torna allo shop
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h1 className="text-3xl font-bold text-green-700 mb-2">✓ Ordine Confermato!</h1>
          <p className="text-green-600">Grazie per il tuo acquisto. Di seguito i dettagli del tuo ordine:</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Numero Ordine */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Numero Ordine</h2>
              <p className="text-2xl font-mono text-blue-600">{order.id}</p>
              <p className="text-sm text-slate-600 mt-2">
                Data: {new Date(order.createdAt).toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            {/* Indirizzo Spedizione */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Indirizzo di Spedizione</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{order.address}</p>
            </div>

            {/* Articoli */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Articoli Ordinati</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center pb-4 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-slate-600">Quantità: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{(item.price * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-slate-600">€{item.price.toFixed(2)} cad.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metodo Pagamento */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Informazioni Pagamento</h2>
              <p className="text-slate-700 mb-2">
                <strong>Metodo:</strong>{" "}
                {order.paymentMethod === "cash"
                  ? "Contrassegno (Pagamento alla consegna)"
                  : order.paymentMethod === "stripe"
                    ? "Carta di Credito"
                    : "PayPal"}
              </p>
              <p className="text-sm text-slate-600">
                {order.paymentMethod === "cash"
                  ? "Pagherai al ritiro del pacco dal corriere."
                  : "Il pagamento è stato elaborato con successo."}
              </p>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 h-fit">
            <h2 className="text-lg font-bold mb-4">Riepilogo</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotale:</span>
                <span className="font-medium">€{order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Spedizione:</span>
                <span className="font-medium">A calcolarsi</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-base font-bold">
                <span>Totale:</span>
                <span>€{order.total.toFixed(2)}</span>
              </div>
              <div className="pt-3">
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  Status: {order.status}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <Link
                href="/dashboard/orders"
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Vai ai Miei Ordini
              </Link>
              <Link
                href="/shop"
                className="block w-full text-center px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors text-sm font-medium"
              >
                Continua lo Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
