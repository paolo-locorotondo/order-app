"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OrderModel, OrderItemModel, ProductModel, UserModel } from "@/app/generated/prisma/models";
import { PaymentMethods, OrderStatus } from "@/app/generated/prisma/enums";
import FormFeedback from "@/components/FormFeedback";
import QuantityStepper from "@/components/QuantityStepper";
import PriceInput from "@/components/PriceInput";
import { ORDER_STATUS_COLORS, orderStatusLabel } from "@/lib/order-status";

interface OrderWithDetails extends OrderModel {
    items: (OrderItemModel & { product: ProductModel })[];
    user: Pick<UserModel, "id" | "name" | "email">;
}

interface EditableItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
}

const PAYMENT_LABELS: Record<PaymentMethods, string> = {
    [PaymentMethods.CASH]: "Contanti (Pagamento alla consegna)",
    [PaymentMethods.STRIPE]: "Carta di Credito (Stripe)",
    [PaymentMethods.PAYPAL]: "PayPal",
};

interface EditOrderPanelProps {
    order: OrderWithDetails;
    products: (ProductModel & { inventory: { quantity: number; reserved: number } | null })[];
    users: Pick<UserModel, "id" | "name" | "email">[];
    onSuccess?: () => void;
}

export default function EditOrderPanel({ order, products, users, onSuccess }: EditOrderPanelProps) {
    const router = useRouter();
    const [editingStatus, setEditingStatus] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState("");

    const [editingItems, setEditingItems] = useState(false);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesDraft, setNotesDraft] = useState(order.notes ?? "");
    const [editingUser, setEditingUser] = useState(false);
    const [userLoading, setUserLoading] = useState(false);
    const [userDraft, setUserDraft] = useState(order.userId);
    const [items, setItems] = useState<EditableItem[]>(() =>
        order.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            price: it.price,
        }))
    );

    const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const editTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleUpdateStatus = useCallback(async (newStatus: OrderStatus) => {
        setStatusLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/orders/${order.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `Errore ${response.status}`);
            }
            setEditingStatus(false);
            setSuccess("Stato ordine aggiornato con successo.");

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }

            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore sconosciuto");
        } finally {
            setStatusLoading(false);
        }
    }, [order.id, router, onSuccess]);

    const updateItem = (index: number, field: keyof EditableItem, value: string | number) =>
        setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

    const removeItem = (index: number) =>
        setItems((prev) => prev.filter((_, i) => i !== index));

    const addItem = () => {
        const firstAvailable = products.find(
            (p) => ((p.inventory?.quantity ?? 0) - (p.inventory?.reserved ?? 0)) > 0
        );
        if (!firstAvailable) return;
        setItems((prev) => [
            ...prev,
            {
                productId: firstAvailable.id,
                productName: firstAvailable.name,
                quantity: 1,
                price: firstAvailable.price,
            },
        ]);
    };

    const onProductChange = (index: number, productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return;
        setItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? { ...item, productId, productName: product.name, price: product.price }
                    : item
            )
        );
    };

    const cancelItemsEdit = () => {
        setItems(
            order.items.map((it) => ({
                productId: it.productId,
                productName: it.productName,
                quantity: it.quantity,
                price: it.price,
            }))
        );
        setEditingItems(false);
        setError(null);
    };

    const handleSaveUser = async () => {
        setError(null);
        if (userDraft === order.userId) {
            setEditingUser(false);
            return;
        }
        const newUser = users.find((u) => u.id === userDraft);
        if (!confirm(`Confermi il cambio cliente da "${order.user?.name || order.user?.email}" a "${newUser?.name || newUser?.email}"?`)) {
            return;
        }
        setUserLoading(true);
        try {
            const response = await fetch(`/api/admin/orders/${order.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: userDraft }),
            });
            if (!response.ok) {
                const data = await response.json();
                const errMsg = data.error;
                throw new Error(typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg || `Errore ${response.status}`);
            }
            setSuccess("Cliente aggiornato.");
            setEditingUser(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore sconosciuto");
        } finally {
            setUserLoading(false);
        }
    };

    const cancelUserEdit = () => {
        setUserDraft(order.userId);
        setEditingUser(false);
        setError(null);
    };

    const handleSaveNotes = async () => {
        setError(null);
        setNotesLoading(true);
        try {
            const response = await fetch(`/api/admin/orders/${order.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: notesDraft }),
            });
            if (!response.ok) {
                const data = await response.json();
                const errMsg = data.error;
                throw new Error(typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg || `Errore ${response.status}`);
            }
            setSuccess("Note aggiornate.");
            setEditingNotes(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore sconosciuto");
        } finally {
            setNotesLoading(false);
        }
    };

    const cancelNotesEdit = () => {
        setNotesDraft(order.notes ?? "");
        setEditingNotes(false);
        setError(null);
    };

    const handleSaveItems = async () => {
        setError(null);
        if (items.length === 0) {
            setError("Un ordine deve contenere almeno un articolo.");
            return;
        }
        if (items.some((i) => !i.productId || i.quantity < 1 || i.price < 0 || !i.productName.trim())) {
            setError("Compila tutti i campi degli articoli (qty ≥ 1, prezzo ≥ 0, nome non vuoto).");
            return;
        }
        if (items.some((i) => Math.abs(i.price * 100 - Math.round(i.price * 100)) >= 1e-6)) {
            setError("Il prezzo accetta al massimo 2 decimali.");
            return;
        }
        setItemsLoading(true);
        try {
            const response = await fetch(`/api/admin/orders/${order.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            });
            if (!response.ok) {
                const data = await response.json();
                const errMsg = data.error;
                throw new Error(typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg || `Errore ${response.status}`);
            }
            setSuccess("Articoli aggiornati con successo.");
            setEditingItems(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore sconosciuto");
        } finally {
            setItemsLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-base font-bold text-slate-800">
                    Ordine #{order.id.slice(0, 8)}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                    <span className="font-semibold">Data creazione:</span>{" "}
                    {new Date(order.createdAt).toLocaleDateString("it-IT", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })} - {new Date(order.createdAt).toLocaleTimeString("it-IT")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                    <span className="font-semibold">Data modifica:</span>{" "}
                    {new Date(order.updatedAt).toLocaleDateString("it-IT", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })} - {new Date(order.updatedAt).toLocaleTimeString("it-IT")}
                </p>
            </div>

            <div className="space-y-4">
                {/* Cliente */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                        {!editingUser && order.status === OrderStatus.IN_ATTESA && (
                            <button
                                onClick={() => setEditingUser(true)}
                                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                                Cambia cliente
                            </button>
                        )}
                    </div>
                    {editingUser ? (
                        <div className="space-y-2">
                            <select
                                value={userDraft}
                                onChange={(e) => setUserDraft(e.target.value)}
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                            >
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name || u.email} {u.name ? `(${u.email})` : ""}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveUser}
                                    disabled={userLoading}
                                    className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {userLoading ? "Salvataggio..." : "Salva cliente"}
                                </button>
                                <button
                                    onClick={cancelUserEdit}
                                    disabled={userLoading}
                                    className="flex-1 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">
                                ⓘ Il cambio cliente è permesso solo finché l&apos;ordine è {orderStatusLabel(OrderStatus.IN_ATTESA)}.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-slate-800">{order.user?.name || "N/A"}</p>
                            <p className="text-xs text-slate-500">{order.user?.email}</p>
                        </>
                    )}
                </div>

                {/* Indirizzo */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Indirizzo spedizione</p>
                    <p className="text-sm text-slate-700">{order.address || <span className="italic text-slate-400">Non specificato</span>}</p>
                </div>

                {/* Note */}
                <div className="rounded-lg bg-amber-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Note</p>
                        {!editingNotes && (
                            <button
                                onClick={() => setEditingNotes(true)}
                                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                                {order.notes ? "Modifica note" : "Aggiungi note"}
                            </button>
                        )}
                    </div>
                    {editingNotes ? (
                        <div className="space-y-2">
                            <textarea
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                rows={3}
                                maxLength={2000}
                                placeholder="Es: ritirerà il cliente, pagamento con assegno..."
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={notesLoading}
                                    className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {notesLoading ? "Salvataggio..." : "Salva note"}
                                </button>
                                <button
                                    onClick={cancelNotesEdit}
                                    disabled={notesLoading}
                                    className="flex-1 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap text-sm text-slate-700">
                            {order.notes || <span className="italic text-slate-400">Nessuna nota</span>}
                        </p>
                    )}
                </div>

                {/* Pagamento */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Pagamento</p>
                    <p className="text-sm text-slate-700">
                        {PAYMENT_LABELS[order.paymentMethod]}
                    </p>
                </div>

                {/* Prodotti */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prodotti</p>
                        {!editingItems && (
                            <button
                                onClick={() => setEditingItems(true)}
                                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                                Modifica articoli
                            </button>
                        )}
                    </div>

                    {editingItems ? (
                        <div className="space-y-3">
                            {items.map((item, index) => {
                                const product = products.find((p) => p.id === item.productId);
                                const original = order.items.find((it) => it.productId === item.productId);
                                // Available = current free stock (quantity - reserved) + qty già allocata a questo ordine.
                                // (Se l'utente riduce qty, torna stock; se aggiunge una riga sullo stesso prodotto, i delta netto-quotano server-side.)
                                const baseAvailable =
                                    (product?.inventory?.quantity ?? 0) -
                                    (product?.inventory?.reserved ?? 0);
                                const max = baseAvailable + (original?.quantity ?? 0);
                                return (
                                    <div key={index} className="rounded border border-slate-200 bg-white p-2 space-y-2">
                                        <select
                                            value={item.productId}
                                            onChange={(e) => onProductChange(index, e.target.value)}
                                            className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-sm"
                                        >
                                            {products.map((p) => {
                                                const disp = (p.inventory?.quantity ?? 0) - (p.inventory?.reserved ?? 0);
                                                return (
                                                    <option key={p.id} value={p.id} disabled={disp <= 0 && p.id !== item.productId}>
                                                        {p.name} — €{p.price.toFixed(2)} (disp: {disp})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <input
                                            type="text"
                                            value={item.productName}
                                            onChange={(e) => updateItem(index, "productName", e.target.value)}
                                            placeholder="Nome (snapshot)"
                                            className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs"
                                        />
                                        <div className="flex items-center gap-2">
                                            <QuantityStepper
                                                value={item.quantity}
                                                onChange={(n) => updateItem(index, "quantity", n)}
                                                min={1}
                                                max={max || undefined}
                                                size="sm"
                                            />
                                            <PriceInput
                                                value={item.price}
                                                onChange={(n) => updateItem(index, "price", n)}
                                                className="w-28 rounded border border-slate-300 bg-slate-50 pl-6 pr-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-500">/u</span>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                disabled={items.length === 1}
                                                className="ml-auto rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-40"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                + Aggiungi prodotto
                            </button>
                            <div className="flex items-center justify-between border-t pt-2">
                                <span className="text-sm font-bold text-slate-700">Totale:</span>
                                <span className="font-bold text-green-600">€{editTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveItems}
                                    disabled={itemsLoading}
                                    className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {itemsLoading ? "Salvataggio..." : "Salva articoli"}
                                </button>
                                <button
                                    onClick={cancelItemsEdit}
                                    disabled={itemsLoading}
                                    className="flex-1 rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {order.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                        <div>
                                            <p className="font-medium text-slate-800">{item.productName}</p>
                                            <p className="text-xs text-slate-500">Qtà: {item.quantity} × €{item.price.toFixed(2)}</p>
                                        </div>
                                        <p className="font-semibold text-slate-800">€{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t pt-2">
                                <span className="text-sm font-bold text-slate-700">Totale:</span>
                                <span className="font-bold text-green-600">€{orderTotal.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Status */}
                <div className="rounded-lg bg-blue-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status ordine</p>
                    {editingStatus ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                {
                                    Object.values(OrderStatus).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => handleUpdateStatus(status)}
                                            disabled={statusLoading}
                                            className={`rounded px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${status === order.status
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-200 text-slate-900 hover:bg-slate-300"
                                                }`}
                                        >
                                            {statusLoading ? "..." : orderStatusLabel(status)}
                                        </button>
                                    ))}
                            </div>
                            <button
                                onClick={() => setEditingStatus(false)}
                                disabled={statusLoading}
                                className="w-full rounded bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                            >
                                Annulla
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className={`rounded px-2 py-1 text-xs font-medium ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-900"}`}>
                                {orderStatusLabel(order.status)}
                            </span>
                            <button
                                onClick={() => setEditingStatus(true)}
                                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                                Modifica
                            </button>
                        </div>
                    )}
                    <FormFeedback error={error} success={success} className="mt-3" />
                </div>
            </div>
        </div>
    );
}
