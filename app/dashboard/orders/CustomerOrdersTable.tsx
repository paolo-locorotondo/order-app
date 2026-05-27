"use client";

import { useState, useMemo } from "react";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import FiltersAccordion from "@/components/FiltersAccordion";
import RefreshButton from "@/components/RefreshButton";
import Combobox from "@/components/Combobox";
import { OrderModel, OrderItemModel } from "@/app/generated/prisma/models";
import { OrderStatus } from "@/app/generated/prisma/enums";
import { ORDER_STATUS_COLORS, orderStatusLabel } from "@/lib/order-status";
import OrderDetailsPanel from "./OrderDetailsPanel";

interface OrderWithItems extends OrderModel {
    items: (OrderItemModel & { product: { name: string; deliveryDate: Date | null } | null })[];
}

const orderTotal = (o: OrderWithItems) =>
    o.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

type SortField = "createdAt" | "updatedAt";
type SortDir = "asc" | "desc";

interface CustomerOrdersTableProps {
    orders: OrderWithItems[];
}

export default function CustomerOrdersTable({ orders }: CustomerOrdersTableProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
    const [productFilter, setProductFilter] = useState<string>("ALL");
    const [dateField, setDateField] = useState<SortField>("createdAt");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [deliveryFrom, setDeliveryFrom] = useState<string>("");
    const [deliveryTo, setDeliveryTo] = useState<string>("");
    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const filtersActive =
        statusFilter !== "ALL" ||
        productFilter !== "ALL" ||
        dateFrom !== "" ||
        dateTo !== "" ||
        deliveryFrom !== "" ||
        deliveryTo !== "";

    const resetFilters = () => {
        setStatusFilter("ALL");
        setProductFilter("ALL");
        setDateField("createdAt");
        setDateFrom("");
        setDateTo("");
        setDeliveryFrom("");
        setDeliveryTo("");
    };

    const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : undefined;

    // Lista prodotti unici acquistati (derivata): { productId, productName, deliveryDate }.
    // Label canonica = `Product.name` (fallback allo snapshot OrderItem.productName se
    // il prodotto è stato cancellato); così rinomine in OrderItem non duplicano la
    // dropdown — la chiave di filtro resta `productId`.
    const purchasedProducts = useMemo(() => {
        const map = new Map<string, { productName: string; deliveryDate: Date | null }>();
        for (const order of orders) {
            for (const item of order.items) {
                if (!map.has(item.productId)) {
                    map.set(item.productId, {
                        productName: item.product?.name ?? item.productName,
                        deliveryDate: item.product?.deliveryDate ?? null,
                    });
                }
            }
        }
        return Array.from(map.entries())
            .map(([productId, v]) => ({ productId, productName: v.productName, deliveryDate: v.deliveryDate }))
            .sort((a, b) => {
                // Sort per data consegna asc (imminente prima); senza data → in fondo;
                // tiebreak per nome.
                const aTs = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
                const bTs = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
                if (aTs !== bTs) return aTs - bTs;
                return a.productName.localeCompare(b.productName);
            });
    }, [orders]);

    const openDetails = (order: OrderWithItems) => {
        setSelectedOrderId(order.id);
        setModalOpen(true);
    };

    const closeModal = () => {
        setSelectedOrderId(undefined);
        setModalOpen(false);
    };

    const handleSort = (key: string) => {
        const field = key as SortField;
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    const processedOrders = useMemo(() => {
        let result = [...orders];

        if (statusFilter !== "ALL") {
            result = result.filter((o) => o.status === statusFilter);
        }

        if (productFilter !== "ALL") {
            result = result.filter((o) => o.items.some((it) => it.productId === productFilter));
        }

        if (dateFrom || dateTo) {
            const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : -Infinity;
            const toTs = dateTo ? new Date(dateTo + "T23:59:59.999").getTime() : Infinity;
            result = result.filter((o) => {
                const t = new Date(dateField === "createdAt" ? o.createdAt : o.updatedAt).getTime();
                return t >= fromTs && t <= toTs;
            });
        }

        // Filtro per data consegna prodotto: l'ordine matcha se almeno un suo
        // articolo ha `product.deliveryDate` nel range. Articoli senza data sono
        // esclusi dal range — coerente con il filtro analogo di ProductsTable.
        if (deliveryFrom || deliveryTo) {
            const fromTs = deliveryFrom ? new Date(deliveryFrom + "T00:00:00").getTime() : -Infinity;
            const toTs = deliveryTo ? new Date(deliveryTo + "T23:59:59.999").getTime() : Infinity;
            result = result.filter((o) =>
                o.items.some((it) => {
                    if (!it.product?.deliveryDate) return false;
                    const t = new Date(it.product.deliveryDate).getTime();
                    return t >= fromTs && t <= toTs;
                })
            );
        }

        result.sort((a, b) => {
            const valA = new Date(sortField === "createdAt" ? a.createdAt : a.updatedAt).getTime();
            const valB = new Date(sortField === "createdAt" ? b.createdAt : b.updatedAt).getTime();
            return sortDir === "asc" ? valA - valB : valB - valA;
        });

        return result;
    }, [orders, statusFilter, productFilter, dateField, dateFrom, dateTo, deliveryFrom, deliveryTo, sortField, sortDir]);

    const columns: AdminTableColumn<OrderWithItems>[] = [
        {
            key: "id",
            header: "Ordine",
            cell: (o) => <span className="font-mono text-xs text-slate-500">{o.id.slice(0, 8)}</span>,
        },
        {
            key: "items",
            header: "Articoli",
            cell: (o) => (
                <div className="flex flex-wrap gap-1">
                    {o.items.map((item) => {
                        const delivery = item.product?.deliveryDate
                            ? ` (cons. ${new Date(item.product.deliveryDate).toLocaleDateString("it-IT")})`
                            : "";
                        const label = `${item.productName}${delivery}`;
                        return (
                            <span
                                key={item.id}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900"
                            >
                                <span className="font-bold">{item.quantity}×</span>
                                <span className="max-w-[200px] truncate" title={label}>
                                    {label}
                                </span>
                            </span>
                        );
                    })}
                </div>
            ),
        },
        {
            key: "total",
            header: "Totale",
            align: "right",
            cell: (o) => <span className="font-semibold">€{orderTotal(o).toFixed(2)}</span>,
        },
        {
            key: "status",
            header: "Status",
            cell: (o) => (
                <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                        ORDER_STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-900"
                    }`}
                >
                    {orderStatusLabel(o.status)}
                </span>
            ),
        },
        {
            key: "createdAt",
            header: "Data creazione",
            sortable: true,
            cell: (o) => (
                <span className="text-xs text-slate-500">
                    {new Date(o.createdAt).toLocaleDateString("it-IT")} -{" "}
                    {new Date(o.createdAt).toLocaleTimeString("it-IT")}
                </span>
            ),
        },
        {
            key: "updatedAt",
            header: "Data modifica",
            sortable: true,
            cell: (o) => (
                <span className="text-xs text-slate-500">
                    {new Date(o.updatedAt).toLocaleDateString("it-IT")} -{" "}
                    {new Date(o.updatedAt).toLocaleTimeString("it-IT")}
                </span>
            ),
        },
    ];

    return (
        <>
            <div className="space-y-4">
                {/* Azioni: refresh */}
                <div className="flex flex-wrap items-center gap-3">
                    <RefreshButton />
                </div>

                {/* Filtri — accordion */}
                <FiltersAccordion
                    summary={
                        processedOrders.length !== orders.length
                            ? `(${processedOrders.length} di ${orders.length} ordini)`
                            : undefined
                    }
                    onReset={resetFilters}
                    canReset={filtersActive}
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                        <Combobox
                            className="w-full sm:w-64"
                            value={productFilter === "ALL" ? "" : productFilter}
                            onChange={(v) => setProductFilter(v || "ALL")}
                            placeholder="Tutti i prodotti"
                            options={purchasedProducts.map((p) => ({
                                value: p.productId,
                                label: p.deliveryDate
                                    ? `${p.productName} (cons. ${new Date(p.deliveryDate).toLocaleDateString("it-IT")})`
                                    : p.productName,
                            }))}
                        />

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={dateField}
                                onChange={(e) => setDateField(e.target.value as SortField)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
                            >
                                <option value="createdAt">Data creazione</option>
                                <option value="updatedAt">Data modifica</option>
                            </select>
                            <label className="text-xs text-slate-500">Da</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
                            />
                            <label className="text-xs text-slate-500">A</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs text-slate-500">Consegna prodotto — Da</label>
                            <input
                                type="date"
                                value={deliveryFrom}
                                onChange={(e) => setDeliveryFrom(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
                            />
                            <label className="text-xs text-slate-500">A</label>
                            <input
                                type="date"
                                value={deliveryTo}
                                onChange={(e) => setDeliveryTo(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setStatusFilter("ALL")}
                                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                                    statusFilter === "ALL"
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                }`}
                            >
                                Tutti ({orders.length})
                            </button>
                            {Object.values(OrderStatus).map((status) => {
                                const count = orders.filter((o) => o.status === status).length;
                                return (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                                            statusFilter === status
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                        }`}
                                    >
                                        {orderStatusLabel(status)} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </FiltersAccordion>

                {/* Risultati */}
                {processedOrders.length !== orders.length && (
                    <p className="text-xs text-slate-500">
                        {processedOrders.length} di {orders.length} ordini
                    </p>
                )}

                <AdminTable
                    rows={processedOrders}
                    columns={columns}
                    rowKey={(o) => o.id}
                    onRowClick={(o) => openDetails(o)}
                    emptyMessage="Nessun ordine trovato"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                    renderActions={(order) => (
                        <button
                            onClick={() => openDetails(order)}
                            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        >
                            Dettaglio
                        </button>
                    )}
                />
            </div>

            <AdminModal
                isOpen={modalOpen}
                onClose={closeModal}
                title={selectedOrder ? `Dettaglio ordine #${selectedOrder.id}` : "Dettaglio ordine"}
            >
                {selectedOrder && <OrderDetailsPanel order={selectedOrder} />}
            </AdminModal>
        </>
    );
}
