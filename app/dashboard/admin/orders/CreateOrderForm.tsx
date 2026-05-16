"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductModel, UserModel } from "@/app/generated/prisma/models";

interface OrderItem {
    productId: string;
    quantity: number;
}

interface CreateOrderFormProps {
    users: Pick<UserModel, "id" | "name" | "email">[];
    products: (ProductModel & { inventory: { quantity: number } | null })[];
    onCancel?: () => void;
}

export default function CreateOrderForm({ users, products, onCancel }: CreateOrderFormProps) {
    const router = useRouter();
    const [userId, setUserId] = useState("");
    const [address, setAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "stripe" | "paypal">("cash");
    const [items, setItems] = useState<OrderItem[]>([{ productId: "", quantity: 1 }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const inputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none";
    const labelClass = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

    const addItem = () => setItems((prev) => [...prev, { productId: "", quantity: 1 }]);

    const removeItem = (index: number) =>
        setItems((prev) => prev.filter((_, i) => i !== index));

    const updateItem = (index: number, field: keyof OrderItem, value: string | number) =>
        setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));

    // Calcola totale stimato lato client
    const estimatedTotal = items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + (product?.price ?? 0) * item.quantity;
    }, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validazione base lato client
        if (!userId) { setError("Seleziona un utente."); return; }
        if (items.some((i) => !i.productId)) { setError("Seleziona un prodotto per ogni riga."); return; }

        setLoading(true);
        try {
            const response = await fetch("/api/admin/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, address, paymentMethod, items }),
            });

            if (!response.ok) {
                const data = await response.json();
                const errMsg = data.error;
                throw new Error(typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg || `Errore ${response.status}`);
            }

            setSuccess("Ordine creato con successo.");
            setUserId("");
            setAddress("");
            setPaymentMethod("cash");
            setItems([{ productId: "", quantity: 1 }]);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore sconosciuto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">Nuovo Ordine</h2>
                {onCancel && (
                    <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600">
                        ✕ Annulla
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Utente */}
                <div>
                    <label className={labelClass}>Utente *</label>
                    <select value={userId} onChange={(e) => setUserId(e.target.value)} required className={inputClass}>
                        <option value="">Seleziona utente...</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name || u.email} {u.name ? `(${u.email})` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Indirizzo */}
                <div>
                    <label className={labelClass}>Indirizzo spedizione *</label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        rows={2}
                        placeholder="Via Roma 1, 00100 Roma"
                        className={inputClass}
                    />
                </div>

                {/* Metodo pagamento */}
                <div>
                    <label className={labelClass}>Metodo di pagamento</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className={inputClass}>
                        <option value="cash">Contrassegno</option>
                        <option value="stripe">Carta di credito</option>
                        <option value="paypal">PayPal</option>
                    </select>
                </div>

                {/* Prodotti */}
                <div>
                    <label className={labelClass}>Prodotti *</label>
                    <div className="space-y-2">
                        {items.map((item, index) => {
                            const selectedProduct = products.find((p) => p.id === item.productId);
                            const available = selectedProduct?.inventory?.quantity ?? 0;
                            return (
                                <div key={index} className="flex gap-2 items-start">
                                    <select
                                        value={item.productId}
                                        onChange={(e) => updateItem(index, "productId", e.target.value)}
                                        required
                                        className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Seleziona prodotto...</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id} disabled={(p.inventory?.quantity ?? 0) === 0}>
                                                {p.name} — €{p.price.toFixed(2)} {(p.inventory?.quantity ?? 0) === 0 ? "(esaurito)" : `(disp: ${p.inventory?.quantity})`}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min={1}
                                        max={available || 9999}
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                                        className="w-16 rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-center text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="rounded-lg bg-red-100 px-2 py-2 text-xs text-red-700 hover:bg-red-200"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                        + Aggiungi prodotto
                    </button>
                </div>

                {/* Totale stimato */}
                {estimatedTotal > 0 && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-slate-500">Totale stimato: </span>
                        <span className="font-bold text-slate-800">€{estimatedTotal.toFixed(2)}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? "Creazione..." : "Crea Ordine"}
                </button>
            </form>
        </div>
    );
}
