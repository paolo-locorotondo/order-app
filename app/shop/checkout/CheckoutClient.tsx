"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CartItemsList from "../_components/CartItemsList";
import CheckoutForm, { CheckoutFormData } from "./CheckoutForm";
import { notifyCartChanged } from "@/lib/cart-events";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image: string | null;
  };
  quantity: number;
}

export default function CheckoutClient({ items }: { items: CartItem[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(true);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationMessage, setReservationMessage] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const initRanRef = useRef(false);
  const isCompletingRef = useRef(false);

  const total = items.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const applyExpiresAt = (iso: string) => {
    setExpiresAt(iso);
    const diffMs = Date.parse(iso) - Date.now();
    setRemainingSeconds(Math.max(0, Math.ceil(diffMs / 1000)));
  };

  // Inizializzazione: il SERVER è la fonte di verità.
  // 1. GET /api/cart/reserve → se esiste reservation valida, la riusa.
  // 2. Altrimenti POST per crearne una nuova.
  // useRef evita la doppia esecuzione di useEffect in React Strict Mode (dev).
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    const initReservation = async () => {
      setReservationLoading(true);
      setReservationError(null);

      try {
        const getRes = await fetch("/api/cart/reserve", { method: "GET" });
        const getData = await getRes.json();

        if (!getRes.ok) {
          throw new Error(typeof getData.error === "string" ? getData.error : "Errore nel recupero della prenotazione");
        }

        if (getData.data?.reservation?.expiresAt) {
          applyExpiresAt(getData.data.reservation.expiresAt);
          setReservationMessage("Prodotti riservati per il checkout.");
          return;
        }

        const postRes = await fetch("/api/cart/reserve", { method: "POST" });
        const postData = await postRes.json();

        if (!postRes.ok) {
          throw new Error(typeof postData.error === "string" ? postData.error : "Errore durante la prenotazione dei prodotti");
        }

        if (!postData.data?.expiresAt) {
          throw new Error("Impossibile ottenere la scadenza della prenotazione");
        }

        applyExpiresAt(postData.data.expiresAt);
        setReservationMessage("Prodotti riservati per il checkout. Completa l'ordine entro 5 minuti.");
      } catch (err) {
        setReservationError((err as Error).message);
        setReservationMessage(null);
        setExpiresAt(null);
      } finally {
        setReservationLoading(false);
      }
    };

    initReservation();
  }, []);

  // Timer countdown.
  useEffect(() => {
    if (!expiresAt || reservationError) return;

    const tick = () => {
      const diffMs = Date.parse(expiresAt) - Date.now();
      const secs = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(secs);

      if (secs <= 0) {
        window.clearInterval(intervalId);
        if (!isCompletingRef.current) {
          handleExpire();
        }
      }
    };

    const intervalId = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(intervalId);
  }, [expiresAt, reservationError]);

  const releaseCart = async () => {
    try {
      await fetch("/api/cart/release", { method: "POST" });
    } catch (error) {
      console.error("Release reservation failed", error);
    }
  };

  const handleExpire = async () => {
    await releaseCart();
    setReservationError("Sessione checkout scaduta. I prodotti non sono più riservati per il checkout.");
    router.replace("/shop/cart?expired=true");
  };

  const handleCheckout = async (formData: CheckoutFormData) => {
    if (reservationLoading) return;
    if (reservationError || !expiresAt) {
      setReservationError("La prenotazione non è disponibile. Torna al carrello e riprova.");
      return;
    }

    setSubmitting(true);
    setReservationError(null);
    isCompletingRef.current = true;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Errore nella creazione dell'ordine");
      }

      notifyCartChanged();
      router.push(`/shop/order-confirmation/${data.data.id}`);
    } catch (err) {
      setReservationError((err as Error).message);
      isCompletingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToCart = async () => {
    await releaseCart();
    router.push("/shop/cart");
  };

  return (
    <div>
      {reservationError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {reservationError}
        </div>
      )}

      {!reservationError && reservationMessage && (
        <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-blue-700">
          {reservationMessage}
          {expiresAt && (
            <div className="mt-2 text-sm">
              Tempo rimanente: <strong>{formatTimer(remainingSeconds)}</strong>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm mb-6 sm:p-6">
            <h2 className="mb-4 text-lg font-bold">Riepilogo Carrello</h2>
            <CartItemsList items={items} readOnly />
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">Totale Ordine</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotale:</span>
                <span>€{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Spedizione:</span>
                <span>Calcolata alla consegna</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Totale:</span>
                <span>€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <CheckoutForm onSubmit={handleCheckout} loading={submitting || reservationLoading} />

          <div className="mt-4">
            <button
              type="button"
              onClick={handleBackToCart}
              className="w-full rounded bg-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-300 transition-colors"
            >
              ← Torna al carrello
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
