"use client";

import { OrderModel, OrderItemModel } from "@/app/generated/prisma/models";
import { PaymentMethods } from "@/app/generated/prisma/enums";
import { ORDER_STATUS_COLORS, orderStatusLabel } from "@/lib/order-status";

interface OrderWithItems extends OrderModel {
    items: OrderItemModel[];
}

const PAYMENT_LABELS: Record<PaymentMethods, string> = {
    [PaymentMethods.CASH]: "Contanti (Pagamento alla consegna)",
    [PaymentMethods.STRIPE]: "Carta di Credito (Stripe)",
    [PaymentMethods.PAYPAL]: "PayPal",
};

interface OrderDetailsPanelProps {
    order: OrderWithItems;
}

export default function OrderDetailsPanel({ order }: OrderDetailsPanelProps) {
    const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
                {/* Status */}
                <div className="rounded-lg bg-blue-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-900"}`}>
                        {orderStatusLabel(order.status)}
                    </span>
                </div>

                {/* Indirizzo */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Indirizzo spedizione</p>
                    <p className="text-sm text-slate-700">
                        {order.address || <span className="italic text-slate-400">Non specificato</span>}
                    </p>
                </div>

                {/* Note */}
                {order.notes && (
                    <div className="rounded-lg bg-amber-50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Note</p>
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{order.notes}</p>
                    </div>
                )}

                {/* Pagamento */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Pagamento</p>
                    <p className="text-sm text-slate-700">{PAYMENT_LABELS[order.paymentMethod]}</p>
                </div>

                {/* Articoli */}
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Articoli</p>
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
                </div>
            </div>
        </div>
    );
}
