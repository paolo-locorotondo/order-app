"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OrderModel, OrderItemModel, ProductModel, UserModel } from "@/app/generated/prisma/models";

interface OrderWithDetails extends OrderModel {
    items: (OrderItemModel & { product: ProductModel })[];
    user: Pick<UserModel, "id" | "name" | "email">;
}

const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-900",
    PAID: "bg-blue-100 text-blue-900",
    SHIPPED: "bg-purple-100 text-purple-900",
    DELIVERED: "bg-green-100 text-green-900",
    CANCELLED: "bg-red-100 text-red-900",
};

interface EditOrderPanelProps {
    order: OrderWithDetails;
    onCancel: () => void;
}

export default function EditOrderPanel({ order, onCancel }: EditOrderPanelProps) {
    const router = useRouter();
    const [editingStatus, setEditingStatus] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            router.refresh();
            onCancel();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore sconosciuto");
        } finally {
            setStatusLoading(false);
        }
    }, [order.id, router, onCancel]);

    const handleDelete = async () => {
        setDeleteLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `Errore ${response.status}`);
            }
            setDeleteConfirm(false);
            router.refresh();
            onCancel();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore sconosciuto");
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-800">
                        Ordine #{order.id.slice(0, 8)}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString("it-IT", {
                            weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })} - {new Date(order.createdAt).toLocaleTimeString("it-IT")}
                    </p>
                </div>
                <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600">
                    ✕ Chiudi
                </button>
            </div>

            {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {/* Cliente */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                    <p className="text-sm font-medium text-slate-800">{order.user?.name || "N/A"}</p>
                    <p className="text-xs text-slate-500">{order.user?.email}</p>
                </div>

                {/* Indirizzo */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Indirizzo spedizione</p>
                    <p className="text-sm text-slate-700">{order.address}</p>
                </div>

                {/* Pagamento */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Pagamento</p>
                    <p className="text-sm text-slate-700">
                        {order.paymentMethod === "cash" ? "Contrassegno" : order.paymentMethod === "stripe" ? "Carta di credito" : "PayPal"}
                    </p>
                </div>

                {/* Prodotti */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Prodotti OLD</p>
                    <div className="space-y-2">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="font-medium text-slate-800">{item.product?.name}</p>
                                    <p className="text-xs text-slate-500">Qtà: {item.quantity}</p>
                                </div>
                                <p className="font-semibold text-slate-800">€{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-2">
                        <span className="text-sm font-bold text-slate-700">Totale:</span>
                        <span className="font-bold text-green-600">€{order.total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Status */}
                <div className="rounded-lg bg-blue-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status ordine</p>
                    {editingStatus ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                {ORDER_STATUSES.map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleUpdateStatus(status)}
                                        disabled={statusLoading}
                                        className={`rounded px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${status === order.status
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-200 text-slate-900 hover:bg-slate-300"
                                            }`}
                                    >
                                        {statusLoading ? "..." : status}
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
                            <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-900"}`}>
                                {order.status}
                            </span>
                            <button
                                onClick={() => setEditingStatus(true)}
                                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                                Modifica
                            </button>
                        </div>
                    )}
                </div>

                {/* Elimina */}
                {deleteConfirm ? (
                    <div className="flex gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {deleteLoading ? "Eliminando..." : "Conferma eliminazione"}
                        </button>
                        <button
                            onClick={() => setDeleteConfirm(false)}
                            disabled={deleteLoading}
                            className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                        >
                            Annulla
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setDeleteConfirm(true)}
                        className="w-full rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-200"
                    >
                        Annulla ordine
                    </button>
                )}
            </div>
        </div>
    );
}
