"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CartItemsList from "@/components/CartItemsList";
import CheckoutForm, { CheckoutFormData } from "@/components/CheckoutForm";
import Link from "next/link";

interface CartItem {
    id: string;
    product: {
        id: string;
        name: string;
        price: number;
    };
    quantity: number;
}

export default function CheckoutClient({ items }: { items: CartItem[] }) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const total = items.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);

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
            router.push(`/shop/order-confirmation/${order.data.id}`);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            {error && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Carrello (sola lettura nel checkout) */}
                <div className="lg:col-span-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm mb-6">
                        <h2 className="mb-4 text-lg font-bold">Riepilogo Carrello</h2>
                        <CartItemsList
                            items={items}
                            onRemove={async () => { }}
                            onUpdateQty={async () => { }}
                        />
                    </div>
                </div>

                {/* Totale + Form */}
                <div>
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

                    <CheckoutForm onSubmit={handleCheckout} loading={submitting} />

                    <div className="mt-4">
                        <Link href="/shop/cart" className="text-sm text-blue-600 hover:underline">
                            ← Torna al carrello
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
