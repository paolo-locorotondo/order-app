"use client";

import { useState, useMemo } from "react";
import AdminModal from "@/components/AdminModal";
import { OrderModel, OrderItemModel, ProductModel, UserModel } from "@/app/generated/prisma/models";
import { OrderStatus } from "@/app/generated/prisma/enums";
import CreateOrderForm from "./CreateOrderForm";
import EditOrderPanel from "./EditOrderPanel";

interface OrderWithDetails extends OrderModel {
    items: (OrderItemModel & { product: ProductModel })[];
    user: Pick<UserModel, "id" | "name" | "email">;
}

type SortField = "createdAt" | "total";
type SortDir = "asc" | "desc";

const STATUS_COLORS: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: "bg-yellow-100 text-yellow-900",
    [OrderStatus.PAID]: "bg-blue-100 text-blue-900",
    [OrderStatus.SHIPPED]: "bg-purple-100 text-purple-900",
    [OrderStatus.DELIVERED]: "bg-green-100 text-green-900",
    [OrderStatus.CANCELLED]: "bg-red-100 text-red-900",
};

interface OrdersTableProps {
    orders: OrderWithDetails[];
    users: Pick<UserModel, "id" | "name" | "email">[];
    products: (ProductModel & { inventory: { quantity: number } | null })[];
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
    if (sortField !== field) return <span className="ml-1 text-slate-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

export default function OrdersTable({ orders, users, products }: OrdersTableProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | undefined>();
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
    const [userFilter, setUserFilter] = useState("");
    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const openModal = (order: OrderWithDetails) => {
        setSelectedOrder(order);
        setModalOpen(true);
    };

    const openModalForCreation = () => {
        setSelectedOrder(undefined);
        setModalOpen(true);
    };

    const closeModal = () => {
        setSelectedOrder(undefined);
        setModalOpen(false);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => d === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    const processedOrders = useMemo(() => {
        let result = [...orders];

        // Filtro status
        if (statusFilter !== "ALL") {
            result = result.filter((o) => o.status === statusFilter);
        }

        // Filtro utente (nome o email, case-insensitive)
        if (userFilter.trim()) {
            const q = userFilter.trim().toLowerCase();
            result = result.filter(
                (o) =>
                    o.user?.name?.toLowerCase().includes(q) ||
                    o.user?.email?.toLowerCase().includes(q)
            );
        }

        // Ordinamento
        result.sort((a, b) => {
            let valA: number;
            let valB: number;
            if (sortField === "createdAt") {
                valA = new Date(a.createdAt).getTime();
                valB = new Date(b.createdAt).getTime();
            } else {
                valA = a.total;
                valB = b.total;
            }
            return sortDir === "asc" ? valA - valB : valB - valA;
        });

        return result;
    }, [orders, statusFilter, userFilter, sortField, sortDir]);

    const thClass = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
    const thSortClass = `${thClass} cursor-pointer select-none hover:text-slate-800`;

    return (
        <>
            {/* Tabella */}
            <div className="space-y-4">

                {/* Pulsante per creare un nuovo ordine */}
                <button
                    onClick={() => openModalForCreation()}
                    className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Crea nuovo ordine
                </button>

                {/* Filtri */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                    {/* Filtro utente */}
                    <input
                        type="text"
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        placeholder="Cerca per nome o email..."
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-full sm:w-56"
                    />

                    {/* Filtri status */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setStatusFilter("ALL")}
                            className={`rounded px-3 py-1.5 text-sm font-medium transition ${statusFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
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
                                    className={`rounded px-3 py-1.5 text-sm font-medium transition ${statusFilter === status ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                        }`}
                                >
                                    {status} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Risultati */}
                {processedOrders.length !== orders.length && (
                    <p className="text-xs text-slate-500">
                        {processedOrders.length} di {orders.length} ordini
                    </p>
                )}

                {/* Tabella */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={thClass}>ID</th>
                                <th className={thClass}>Cliente</th>
                                <th className={thClass}>Articoli</th>
                                <th
                                    className={`${thSortClass} text-right`}
                                    onClick={() => handleSort("total")}
                                >
                                    Totale <SortIcon field="total" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th className={thClass}>Status</th>
                                <th
                                    className={thSortClass}
                                    onClick={() => handleSort("createdAt")}
                                >
                                    Data <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th className={thClass}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {processedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                                        Nessun ordine trovato
                                    </td>
                                </tr>
                            ) : (
                                processedOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-slate-50"
                                        onClick={() => openModal(order)}
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{order.id.slice(0, 8)}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-slate-700">{order.user?.name || "N/A"}</p>
                                            <p className="text-xs text-slate-500">{order.user?.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {order.items.length} {order.items.length === 1 ? "articolo" : "articoli"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                            €{order.total.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-900"}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {new Date(order.createdAt).toLocaleDateString("it-IT")} - {new Date(order.createdAt).toLocaleTimeString("it-IT")}
                                        </td>
                                        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => openModal(order)}
                                                className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                                            >
                                                Modifica
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <AdminModal
                isOpen={modalOpen}
                onClose={closeModal}
                title={selectedOrder ? `Gestisci ordine #${selectedOrder.id}` : "Gestisci nuovo ordine"}
            >
                {
                    selectedOrder
                        ? <EditOrderPanel order={selectedOrder}
                            onCancel={closeModal}
                            onSuccess={undefined} />
                        : <CreateOrderForm users={users} products={products} />
                }
            </AdminModal>
        </>
    );
}
