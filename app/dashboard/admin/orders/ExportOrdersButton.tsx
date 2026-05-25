"use client";

import { OrderModel, OrderItemModel, ProductModel, UserModel } from "@/app/generated/prisma/models";

interface OrderWithDetails extends OrderModel {
    items: (OrderItemModel & { product: ProductModel })[];
    user: Pick<UserModel, "id" | "name" | "email">;
}

const SEPARATOR = ";";

// CSV escape: campi con il separatore, virgolette o newline vengono wrappati in "..."
// con le virgolette interne raddoppiate.
function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (s.includes(SEPARATOR) || s.includes("\"") || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

// Punto come separatore decimale: compatibile con Power Query default (en-US) e
// Excel italiano gestisce comunque il punto se la colonna viene importata come numero.
function formatPrice(n: number): string {
    return n.toFixed(2);
}

function formatDateTime(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d;
    return `${date.toLocaleDateString("it-IT")} ${date.toLocaleTimeString("it-IT")}`;
}

function buildCsv(orders: OrderWithDetails[]): string {
    const headers = [
        "ID Ordine",
        "Data creazione",
        "Data modifica",
        "Cliente",
        "Email",
        "Status",
        "Indirizzo",
        "Pagamento",
        "Totale Ordine (€)",
        "Articolo - Nome",
        "Articolo - SKU",
        "Articolo - Quantità",
        "Articolo - Prezzo Unitario (€)",
        "Articolo - Subtotale (€)",
    ];

    const rows: string[] = [headers.map(escapeCsv).join(SEPARATOR)];

    for (const order of orders) {
        const orderTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
        const baseFields = [
            order.id,
            formatDateTime(order.createdAt),
            formatDateTime(order.updatedAt),
            order.user?.name ?? "",
            order.user?.email ?? "",
            order.status,
            order.address ?? "",
            order.paymentMethod,
            formatPrice(orderTotal),
        ];

        if (order.items.length === 0) {
            // Edge case: ordine senza articoli (non dovrebbe accadere ma evitiamo di
            // perderlo dall'export). Riga con campi articolo vuoti.
            rows.push([...baseFields, "", "", "", "", ""].map(escapeCsv).join(SEPARATOR));
            continue;
        }

        for (const item of order.items) {
            rows.push(
                [
                    ...baseFields,
                    item.productName,
                    item.product?.sku ?? "",
                    item.quantity,
                    formatPrice(item.price),
                    formatPrice(item.price * item.quantity),
                ]
                    .map(escapeCsv)
                    .join(SEPARATOR)
            );
        }
    }

    return rows.join("\r\n");
}

function downloadCsv(content: string, filename: string) {
    // BOM UTF-8 per far riconoscere a Excel l'encoding e mostrare correttamente gli accenti.
    const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

interface ExportOrdersButtonProps {
    orders: OrderWithDetails[];
}

export default function ExportOrdersButton({ orders }: ExportOrdersButtonProps) {
    const onClick = () => {
        if (orders.length === 0) return;
        const csv = buildCsv(orders);
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        downloadCsv(csv, `ordini-${stamp}.csv`);
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            title={orders.length === 0 ? "Nessun ordine da esportare" : `Esporta ${orders.length} ordini in CSV`}
        >
            <span aria-hidden>⤓</span>
            <span>Esporta CSV ({orders.length})</span>
        </button>
    );
}
