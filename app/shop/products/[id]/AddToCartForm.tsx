"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

interface Props {
  productId: string;
}

export default function AddToCartForm({ productId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addToCart = async () => {
    // BUG FIX #1: REQUIRE AUTHENTICATION - redirect to login if not authenticated
    if (status === "unauthenticated") {
      const callbackUrl = encodeURIComponent(pathname);
      router.push(`/auth/login?callbackUrl=${callbackUrl}`);
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: qty }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("✓ Prodotto aggiunto al carrello");
        setQty(1);
      } else {
        setError(data?.error ?? "Errore nell'aggiunta al carrello");
      }
    } catch (err) {
      setError((err as Error).message ?? "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-20 rounded border p-1"
          disabled={loading || status === "loading"}
        />
        <button
          onClick={addToCart}
          disabled={loading || status === "loading"}
          className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
          title={status === "unauthenticated" ? "Accedi per aggiungere al carrello" : ""}
        >
          {loading ? "Aggiungendo..." : status === "loading" ? "Caricamento..." : "Aggiungi al carrello"}
        </button>
      </div>
      {message ? <p className="text-sm text-green-600 font-medium">{message}</p> : null}
      {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}
    </div>
  );
}
