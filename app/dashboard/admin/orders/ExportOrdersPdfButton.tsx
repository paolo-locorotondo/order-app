"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { OrderModel, OrderItemModel, ProductModel, UserModel } from "@/app/generated/prisma/models";

interface OrderWithDetails extends OrderModel {
    items: (OrderItemModel & { product: ProductModel })[];
    user: Pick<UserModel, "id" | "name" | "email">;
}

interface ExportOrdersPdfButtonProps {
    orders: OrderWithDetails[];
}

const formatPrice = (n: number) => `€${n.toFixed(2)}`;

const formatDate = (d: Date | string | null) =>
    d ? new Date(d).toLocaleDateString("it-IT") : "—";

// Aggregato globale per prodotto sui soli ordini passati in input.
// Stessa logica della pannella "Totali per prodotto" in OrdersTable.
function computeProductTotals(orders: OrderWithDetails[]) {
    const map = new Map<string, { name: string; deliveryDate: Date | null; quantity: number; total: number }>();
    for (const order of orders) {
        for (const item of order.items) {
            const existing = map.get(item.productId);
            if (existing) {
                existing.quantity += item.quantity;
                existing.total += item.quantity * item.price;
            } else {
                map.set(item.productId, {
                    // Per il PDF usiamo il nome canonico Product, non lo snapshot
                    // (l'utente ha esplicitato: "presi da Product non da OrderItems").
                    name: item.product?.name ?? item.productName,
                    deliveryDate: item.product?.deliveryDate ?? null,
                    quantity: item.quantity,
                    total: item.quantity * item.price,
                });
            }
        }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

interface CustomerProductRow {
    productId: string;
    productName: string;
    deliveryDate: Date | null;
    quantity: number;
    total: number;
}

interface CustomerAggregate {
    userId: string;
    name: string;
    email: string;
    rows: CustomerProductRow[];
    subtotal: number;
}

// Aggregato (cliente, prodotto): per ogni utente, lista di righe sommate per
// productId. Sort: clienti per name asc; righe per deliveryDate asc, senza data
// in fondo, tiebreak per nome.
function computeCustomerAggregates(orders: OrderWithDetails[]): CustomerAggregate[] {
    const byUser = new Map<string, CustomerAggregate>();

    for (const order of orders) {
        const userId = order.user?.id ?? "__sconosciuto__";
        let agg = byUser.get(userId);
        if (!agg) {
            agg = {
                userId,
                name: order.user?.name ?? "Cliente sconosciuto",
                email: order.user?.email ?? "",
                rows: [],
                subtotal: 0,
            };
            byUser.set(userId, agg);
        }

        // Inner map per (userId, productId)
        const innerMap = new Map<string, CustomerProductRow>();
        for (const r of agg.rows) innerMap.set(r.productId, r);

        for (const item of order.items) {
            const existing = innerMap.get(item.productId);
            if (existing) {
                existing.quantity += item.quantity;
                existing.total += item.quantity * item.price;
            } else {
                const row: CustomerProductRow = {
                    productId: item.productId,
                    productName: item.product?.name ?? item.productName,
                    deliveryDate: item.product?.deliveryDate ?? null,
                    quantity: item.quantity,
                    total: item.quantity * item.price,
                };
                innerMap.set(item.productId, row);
                agg.rows.push(row);
            }
        }
    }

    // Sort interno: deliveryDate asc, nulls last, tiebreak name
    for (const agg of byUser.values()) {
        agg.rows.sort((a, b) => {
            const aTs = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
            const bTs = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
            if (aTs !== bTs) return aTs - bTs;
            return a.productName.localeCompare(b.productName);
        });
        agg.subtotal = agg.rows.reduce((s, r) => s + r.total, 0);
    }

    return Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildPdf(orders: OrderWithDetails[]): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const productTotals = computeProductTotals(orders);
    const customerAggregates = computeCustomerAggregates(orders);
    const grandTotal = productTotals.reduce((s, p) => s + p.total, 0);
    const grandQty = productTotals.reduce((s, p) => s + p.quantity, 0);

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Riepilogo ordini", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const stampLine = `Generato il ${new Date().toLocaleDateString("it-IT")} ${new Date().toLocaleTimeString("it-IT")} — ${orders.length} ${orders.length === 1 ? "ordine" : "ordini"}`;
    doc.text(stampLine, 14, 24);

    // Sezione 1: Totali per prodotto
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Totali per prodotto", 14, 32);
    doc.setFont("helvetica", "normal");

    autoTable(doc, {
        startY: 35,
        head: [["Prodotto", "Quantità", "Totale"]],
        body: [
            ...productTotals.map((p) => [
                p.deliveryDate ? `${p.name}\n(cons. ${formatDate(p.deliveryDate)})` : p.name,
                String(p.quantity),
                formatPrice(p.total),
            ]),
            [
                { content: "Totale complessivo", styles: { fontStyle: "bold" } },
                { content: String(grandQty), styles: { fontStyle: "bold" } },
                { content: formatPrice(grandTotal), styles: { fontStyle: "bold", textColor: [21, 128, 61] } },
            ],
        ],
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
        columnStyles: {
            0: { cellWidth: "auto" },
            1: { halign: "right", cellWidth: 28 },
            2: { halign: "right", cellWidth: 32 },
        },
        styles: { fontSize: 9, cellPadding: 2 },
    });

    // Sezione 2: Aggregato per cliente
    // Header sezione
    const afterFirst = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 60;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Aggregato per cliente", 14, afterFirst + 10);
    doc.setFont("helvetica", "normal");

    // Renderizziamo un mini-table per ogni cliente, gestendo manualmente le
    // interruzioni di pagina: se il gruppo non entra nello spazio rimasto,
    // forziamo doc.addPage() PRIMA di chiamare autoTable. Questo permette di
    // mostrare l'header solo sul primo cliente di ogni pagina (showHead:
    // 'firstPage') invece che ad ogni mini-table.
    // Larghezze colonna esplicite (no "auto") per allineare i mini-table fra loro.
    const sec2Headers = [["Cliente", "Prodotto", "Qtà", "Totale", "Subtot. cliente", "Appunti"]];
    const sec2ColumnStyles = {
        0: { cellWidth: 38 },
        1: { cellWidth: 45 }, // Prodotto — fisso per allineare i mini-table
        2: { halign: "right" as const, cellWidth: 14 },
        3: { halign: "right" as const, cellWidth: 22 },
        4: { halign: "right" as const, cellWidth: 28 },
        5: { cellWidth: 35 }, // Appunti
    };
    const sec2BaseOpts = {
        head: sec2Headers,
        headStyles: { fillColor: [51, 65, 85] as [number, number, number], textColor: 255 },
        columnStyles: sec2ColumnStyles,
        styles: { fontSize: 9, cellPadding: 2, valign: "middle" as const },
        rowPageBreak: "avoid" as const, // safety: nessuna riga singola spezzata
    };

    const subtotalCellStyles = {
        fillColor: [203, 213, 225] as [number, number, number],
        lineWidth: { top: 0, right: 0, bottom: 0.8, left: 0 },
        lineColor: [51, 65, 85] as [number, number, number],
    };

    // Stime conservative (mm) per pre-flight check del page break.
    // Sovrastimare di poco è ok: al massimo si sposta un gruppo a una pagina
    // nuova quando avrebbe potuto incastrarsi a fondo pagina.
    const HEAD_H = 8;
    const TALL_ROW_H = 12; // riga prodotto a 2 linee (con "(cons. data)")
    const SHORT_ROW_H = 8; // riga prodotto a 1 linea (senza data)
    const SUBTOTAL_H = 9;
    const TOP_MARGIN = 14;
    const BOTTOM_MARGIN = 18; // include spazio per il footer "Pagina X / Y"

    const pageH = doc.internal.pageSize.getHeight();
    let nextY = afterFirst + 13;
    let firstOnPage = true; // primo cliente della pagina corrente → mostra head

    for (const agg of customerAggregates) {
        const customerLabel = agg.email ? `${agg.name}\n${agg.email}` : agg.name;
        const productBody = agg.rows.map((r, idx) => [
            idx === 0 ? customerLabel : "",
            r.deliveryDate ? `${r.productName}\n(cons. ${formatDate(r.deliveryDate)})` : r.productName,
            String(r.quantity),
            formatPrice(r.total),
            "", // subtotale nella riga dedicata sotto
            "", // appunti
        ]);
        const subtotalRow = [
            { content: "", styles: { ...subtotalCellStyles } },
            { content: `Totale ${agg.name}`, styles: { ...subtotalCellStyles, fontStyle: "bold" as const, halign: "right" as const } },
            { content: "", styles: { ...subtotalCellStyles } },
            { content: "", styles: { ...subtotalCellStyles } },
            { content: formatPrice(agg.subtotal), styles: { ...subtotalCellStyles, fontStyle: "bold" as const, textColor: [21, 128, 61] as [number, number, number], halign: "right" as const } },
            { content: "", styles: { ...subtotalCellStyles } },
        ];

        // Pre-flight: stima altezza del gruppo (head solo se firstOnPage).
        const productH = agg.rows.reduce((s, r) => s + (r.deliveryDate ? TALL_ROW_H : SHORT_ROW_H), 0);
        const groupH = (firstOnPage ? HEAD_H : 0) + productH + SUBTOTAL_H;

        if (nextY + groupH > pageH - BOTTOM_MARGIN) {
            // Non entra: vai a pagina nuova e ripristina l'header.
            doc.addPage();
            nextY = TOP_MARGIN;
            firstOnPage = true;
        }

        autoTable(doc, {
            ...sec2BaseOpts,
            startY: nextY,
            body: [...productBody, subtotalRow],
            showHead: firstOnPage ? "firstPage" : "never",
        });
        const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? nextY;
        nextY = finalY + 2;
        firstOnPage = false;
    }

    // Footer paginazione
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        doc.text(`Pagina ${i} / ${pageCount}`, pageW - 14, pageH - 8, { align: "right" });
    }

    return doc;
}

export default function ExportOrdersPdfButton({ orders }: ExportOrdersPdfButtonProps) {
    const onClick = () => {
        if (orders.length === 0) return;
        const doc = buildPdf(orders);
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        doc.save(`ordini-aggregati-${stamp}.pdf`);
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            title={orders.length === 0 ? "Nessun ordine da esportare" : `Esporta ${orders.length} ordini in PDF`}
        >
            <span aria-hidden>⤓</span>
            <span>Esporta PDF ({orders.length})</span>
        </button>
    );
}

