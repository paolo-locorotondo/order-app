"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import { OrderModel, OrderItemModel, ProductModel, UserModel } from "@/app/generated/prisma/models";
import { OrderStatus } from "@/app/generated/prisma/enums";
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

export default function OrdersTable({ orders, users, products }: OrdersTableProps) {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
    const [userFilter, setUserFilter] = useState("");
    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Derivato dalla prop `orders`: dopo router.refresh() l'ordine selezionato riflette i nuovi dati.
    const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : undefined;

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
            const response = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
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
    }, [orders, statusFilter, userFilter, sortField, sortDir]);

    const columns: AdminTableColumn<OrderWithDetails>[] = [
        {
            key: "id",
            header: "ID",
            cell: (o) => <span className="font-mono text-xs text-slate-500">{o.id.slice(0, 8)}</span>,
            hideOnMobile: true,
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
            cell: (o) => `${o.items.length} ${o.items.length === 1 ? "articolo" : "articoli"}`,
            hideOnMobile: true,
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
                        STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-900"
                    }`}
                >
                    {o.status}
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
                {/* Pulsante per creare un nuovo ordine */}
                <button
                    onClick={() => openModalForCreation()}
                    className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Crea nuovo ordine
                </button>

                {/* Filtri */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                    <input
                        type="text"
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        placeholder="Cerca per nome o email..."
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-full sm:w-56"
                    />

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
                    <EditOrderPanel order={selectedOrder} products={products} onCancel={closeModal} onSuccess={undefined} />
                ) : (
                    <CreateOrderForm users={users} products={products} />
                )}
            </AdminModal>
        </>
    );
}
