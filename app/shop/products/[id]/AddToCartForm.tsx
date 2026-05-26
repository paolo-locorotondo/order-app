"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import QuantityStepper from "@/components/QuantityStepper";
import { notifyCartChanged } from "@/lib/cart-events";
import { apiFetch } from "@/lib/fetch";

interface Props {
  productId: string;
  maxQty?: number;
}

export default function AddToCartForm({ productId, maxQty }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isPending = session?.user?.role === "NUOVO";
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

    if (isPending) {
      setError("Account in attesa di approvazione admin.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await apiFetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: qty }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("✓ Prodotto aggiunto al carrello");
        setQty(1);
        notifyCartChanged();
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
        <QuantityStepper
          value={qty}
          onChange={setQty}
          min={1}
          max={maxQty}
          disabled={loading || status === "loading"}
        />
        <button
          onClick={addToCart}
          disabled={loading || status === "loading" || isPending}
          className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
          title={
            status === "unauthenticated"
              ? "Accedi per aggiungere al carrello"
              : isPending
                ? "Account in attesa di approvazione admin"
                : ""
          }
        >
          {loading ? "Aggiungendo..." : status === "loading" ? "Caricamento..." : "Aggiungi al carrello"}
        </button>
      </div>
      {message ? <p className="text-sm text-green-600 font-medium">{message}</p> : null}
      {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}
    </div>
  );
}
