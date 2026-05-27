"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import RefreshButton from "@/components/RefreshButton";
import FiltersAccordion from "@/components/FiltersAccordion";
import Combobox from "@/components/Combobox";
import { apiFetch } from "@/lib/fetch";
import ExportOrdersButton from "./ExportOrdersButton";
import ExportOrdersPdfButton from "./ExportOrdersPdfButton";
import { OrderModel, OrderItemModel, ProductModel, UserModel } from "@/app/generated/prisma/models";
import { OrderStatus } from "@/app/generated/prisma/enums";
import { ORDER_STATUS_COLORS, orderStatusLabel } from "@/lib/order-status";
import CreateOrderForm from "./CreateOrderForm";
import EditOrderPanel from "./EditOrderPanel";

interface OrderWithDetails extends OrderModel {
    items: (OrderItemModel & { product: ProductModel })[];
    user: Pick<UserModel, "id" | "name" | "email">;
}

const orderTotal = (o: OrderWithDetails) =>
    o.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

type SortField = "createdAt" | "updatedAt" | "total";
type SortDir = "asc" | "desc";

interface OrdersTableProps {
    orders: OrderWithDetails[];
    users: Pick<UserModel, "id" | "name" | "email">[];
    products: (ProductModel & { inventory: { quantity: number; reserved: number } | null })[];
}

export default function OrdersTable({ orders, users, products }: OrdersTableProps) {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
    const [userFilter, setUserFilter] = useState("");
    const [productFilter, setProductFilter] = useState<string>("ALL");
    const [dateField, setDateField] = useState<"createdAt" | "updatedAt">("createdAt");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [deliveryFrom, setDeliveryFrom] = useState<string>("");
    const [deliveryTo, setDeliveryTo] = useState<string>("");
    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [totalsOpen, setTotalsOpen] = useState(true);

    const filtersActive =
        statusFilter !== "ALL" ||
        userFilter.trim() !== "" ||
        productFilter !== "ALL" ||
        dateFrom !== "" ||
        dateTo !== "" ||
        deliveryFrom !== "" ||
        deliveryTo !== "";

    const resetFilters = () => {
        setStatusFilter("ALL");
        setUserFilter("");
        setProductFilter("ALL");
        setDateField("createdAt");
        setDateFrom("");
        setDateTo("");
        setDeliveryFrom("");
        setDeliveryTo("");
    };
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Derivato dalla prop `orders`: dopo router.refresh() l'ordine selezionato riflette i nuovi dati.
    const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : undefined;

    // Lista prodotti unici effettivamente presenti negli ordini (derivata).
    // Label canonica = `Product.name` (fallback allo snapshot solo se il prodotto è
    // stato cancellato). Così rinomine in OrderItem.productName (es. "B scontato")
    // non duplicano la dropdown: la chiave del filtro resta `productId`.
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

    const openModal = (order: OrderWithDetails) => {
        setSelectedOrderId(order.id);
        setModalOpen(true);
    };

    const openModalForCreation = () => {
        setSelectedOrderId(undefined);
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

    const handleDelete = async (id: string) => {
        setDeleteLoading(true);
        try {
            const response = await apiFetch(`/api/admin/orders/${id}`, { method: "DELETE" });
            if (!response.ok) {
                const data = await response.json();
                alert(data?.error || "Errore eliminazione ordine");
                return;
            }
            if (selectedOrderId === id) closeModal();
            setDeleteConfirm(null);
            router.refresh();
        } catch {
            alert("Errore di rete. Riprova più tardi.");
        } finally {
            setDeleteLoading(false);
        }
    };

    const processedOrders = useMemo(() => {
        let result = [...orders];

        if (statusFilter !== "ALL") {
            result = result.filter((o) => o.status === statusFilter);
        }

        if (userFilter.trim()) {
            const q = userFilter.trim().toLowerCase();
            result = result.filter(
                (o) =>
                    o.user?.name?.toLowerCase().includes(q) ||
                    o.user?.email?.toLowerCase().includes(q)
            );
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
        // articolo ha `product.deliveryDate` nel range. Stesso pattern di
        // CustomerOrdersTable e ProductsTable.
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
            let valA: number;
            let valB: number;
            if (sortField === "createdAt") {
                valA = new Date(a.createdAt).getTime();
                valB = new Date(b.createdAt).getTime();
            } else if (sortField === "updatedAt") {
                valA = new Date(a.updatedAt).getTime();
                valB = new Date(b.updatedAt).getTime();
            } else {
                valA = orderTotal(a);
                valB = orderTotal(b);
            }
            return sortDir === "asc" ? valA - valB : valB - valA;
        });

        return result;
    }, [orders, statusFilter, userFilter, productFilter, dateField, dateFrom, dateTo, deliveryFrom, deliveryTo, sortField, sortDir]);

    // Aggregazione per prodotto sui soli ordini filtrati. Chiave = productId per
    // evitare collisioni se due prodotti hanno snapshot di nome uguali.
    const productTotals = useMemo(() => {
        // Chiave = productId per evitare collisioni tra prodotti omonimi (es. lo
        // stesso articolo per date di consegna diverse). Manteniamo `id` e
        // `deliveryDate` nel value per disambiguarli a render.
        const map = new Map<string, { id: string; name: string; deliveryDate: Date | null; quantity: number; total: number }>();
        for (const order of processedOrders) {
            for (const item of order.items) {
                const existing = map.get(item.productId);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.total += item.quantity * item.price;
                } else {
                    map.set(item.productId, {
                        id: item.productId,
                        name: item.product?.name ?? item.productName,
                        deliveryDate: item.product?.deliveryDate ?? null,
                        quantity: item.quantity,
                        total: item.quantity * item.price,
                    });
                }
            }
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [processedOrders]);

    const grandTotal = productTotals.reduce((s, p) => s + p.total, 0);
    const grandQty = productTotals.reduce((s, p) => s + p.quantity, 0);

    const columns: AdminTableColumn<OrderWithDetails>[] = [
        {
            key: "id",
            header: "ID",
            cell: (o) => <span className="font-mono text-xs text-slate-500">{o.id.slice(0, 8)}</span>,
        },
        {
            key: "user",
            header: "Cliente",
            cell: (o) => (
                <div>
                    <p className="text-sm font-medium text-slate-700">{o.user?.name || "N/A"}</p>
                    <p className="text-xs text-slate-500">{o.user?.email}</p>
                </div>
            ),
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
            sortable: true,
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
                {/* Azioni: crea ordine + refresh */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => openModalForCreation()}
                        className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Crea nuovo ordine
                    </button>
                    <RefreshButton />
                    <ExportOrdersButton orders={processedOrders} />
                    <ExportOrdersPdfButton orders={processedOrders} />
                </div>

                {/* Totali per prodotto (sui soli ordini filtrati) — accordion in cima */}
                {productTotals.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTotalsOpen((v) => !v)}
                            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                            aria-expanded={totalsOpen}
                        >
                            <h3 className="text-sm font-semibold text-slate-700">
                                Totali per prodotto
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                    ({productTotals.length} {productTotals.length === 1 ? "prodotto" : "prodotti"} — €{grandTotal.toFixed(2)})
                                </span>
                            </h3>
                            <span className="text-slate-400" aria-hidden>{totalsOpen ? "▾" : "▸"}</span>
                        </button>
                        {totalsOpen && (
                            <div className="overflow-x-auto border-t border-slate-100 px-4 pb-4 pt-2">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                            <th className="py-2 pr-4 text-left font-semibold">Prodotto</th>
                                            <th className="py-2 px-4 text-right font-semibold">Quantità</th>
                                            <th className="py-2 pl-4 text-right font-semibold">Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productTotals.map((p) => (
                                            <tr key={p.id} className="border-b border-slate-100 last:border-0">
                                                <td className="py-1.5 pr-4 text-slate-800">
                                                    {p.name}
                                                    {p.deliveryDate && (
                                                        <span className="ml-1 text-xs text-slate-500">
                                                            (cons. {new Date(p.deliveryDate).toLocaleDateString("it-IT")})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1.5 px-4 text-right text-slate-700">{p.quantity}</td>
                                                <td className="py-1.5 pl-4 text-right font-medium text-slate-800">€{p.total.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        <tr className="border-t-2 border-slate-300 bg-slate-50">
                                            <td className="py-2 pr-4 font-semibold text-slate-700">Totale complessivo</td>
                                            <td className="py-2 px-4 text-right font-semibold text-slate-700">{grandQty}</td>
                                            <td className="py-2 pl-4 text-right font-bold text-green-700">€{grandTotal.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

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
                        <input
                            type="text"
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            placeholder="Cerca per nome o email..."
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-full sm:w-56"
                        />

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
                                onChange={(e) => setDateField(e.target.value as "createdAt" | "updatedAt")}
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

                <AdminTable
                    rows={processedOrders}
                    columns={columns}
                    rowKey={(o) => o.id}
                    onRowClick={(o) => openModal(o)}
                    emptyMessage="Nessun ordine trovato"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                    renderActions={(order) => (
                        <>
                            <button
                                onClick={() => openModal(order)}
                                className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                            >
                                Modifica
                            </button>
                            {deleteConfirm === order.id ? (
                                <>
                                    <button
                                        onClick={() => handleDelete(order.id)}
                                        disabled={deleteLoading}
                                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {deleteLoading ? "..." : "Conferma"}
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="rounded bg-slate-400 px-3 py-1 text-xs font-medium text-white hover:bg-slate-500"
                                    >
                                        Annulla
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setDeleteConfirm(order.id)}
                                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                                >
                                    Elimina
                                </button>
                            )}
                        </>
                    )}
                />
            </div>

            {/* Modal */}
            <AdminModal
                isOpen={modalOpen}
                onClose={closeModal}
                title={selectedOrder ? `Gestisci ordine #${selectedOrder.id}` : "Gestisci nuovo ordine"}
            >
                {selectedOrder ? (
                    <EditOrderPanel order={selectedOrder} products={products} users={users} onSuccess={undefined} />
                ) : (
                    <CreateOrderForm users={users} products={products} />
                )}
            </AdminModal>
        </>
    );
}
