"use client";

import { useState } from "react";

interface Props {
  productId: string;
}

export default function AddToCartForm({ productId }: Props) {
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const addToCart = async () => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: qty }),
    });
    if (res.ok) {
      setMessage("Prodotto aggiunto al carrello");
    } else {
      const data = await res.json();
      setMessage(data?.error ?? "Errore");
    }
  };

  return (
    <div className="mt-4 flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="w-20 rounded border p-1"
      />
      <button onClick={addToCart} className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700">
        Aggiungi al carrello
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
