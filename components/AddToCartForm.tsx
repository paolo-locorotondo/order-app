"use client";

import { useState } from "react";

interface Props {
  productId: string;
}

export default function AddToCartForm({ productId }: Props) {
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addToCart = async () => {
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
          disabled={loading}
        />
        <button
          onClick={addToCart}
          disabled={loading}
          className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Aggiungendo..." : "Aggiungi al carrello"}
        </button>
      </div>
      {message ? <p className="text-sm text-green-600 font-medium">{message}</p> : null}
      {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}
    </div>
  );
}
