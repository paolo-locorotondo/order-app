"use client";

import { useState, useMemo } from "react";
import InventoryForm from "./InventoryForm";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import RefreshButton from "@/components/RefreshButton";
import FiltersAccordion from "@/components/FiltersAccordion";
import Combobox from "@/components/Combobox";
import { InventoryModel, ProductModel } from "@/app/generated/prisma/models";

interface InventoryWithProduct extends InventoryModel {
    product: ProductModel | null;
}

type SortField = "product" | "deliveryDate" | "quantity" | "reserved" | "available" | "reorderPoint";
type SortDir = "asc" | "desc";

export default function InventoryTable({ inventory }: { inventory: InventoryWithProduct[] }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState<InventoryWithProduct | undefined>();

    const [productFilter, setProductFilter] = useState<string>("");
    const [deliveryFrom, setDeliveryFrom] = useState<string>("");
    const [deliveryTo, setDeliveryTo] = useState<string>("");
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    // Toggle "Mostra archiviati" (Step 10). Niente bulk action qui: l'archivio
    // si gestisce da Admin Prodotti, l'inventario si limita a riflettere lo stato.
    const [showArchived, setShowArchived] = useState(false);

    const filtersActive = productFilter !== "" || deliveryFrom !== "" || deliveryTo !== "" || showArchived;
    const resetFilters = () => {
        setProductFilter("");
        setDeliveryFrom("");
        setDeliveryTo("");
        setShowArchived(false);
    };

    const handleSort = (key: string) => {
        const field = key as SortField;
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    const openModal = (inv?: InventoryWithProduct) => {
        setSelectedInventory(inv);
        setModalOpen(true);
    };

    const closeModal = () => {
        setSelectedInventory(undefined);
        setModalOpen(false);
    };

    const processedInventory = useMemo(() => {
        let result = [...inventory];

        // Step 10: nascondi gli inventory di prodotti archiviati di default.
        if (!showArchived) {
            result = result.filter((i) => !i.product?.archivedAt);
        }

        if (productFilter) {
            result = result.filter((i) => i.product?.id === productFilter);
        }

        if (deliveryFrom || deliveryTo) {
            const fromTs = deliveryFrom ? new Date(deliveryFrom + "T00:00:00").getTime() : -Infinity;
            const toTs = deliveryTo ? new Date(deliveryTo + "T23:59:59.999").getTime() : Infinity;
            result = result.filter((i) => {
                if (!i.product?.deliveryDate) return false; // i prodotti senza data sono fuori dal range
                const t = new Date(i.product.deliveryDate).getTime();
                return t >= fromTs && t <= toTs;
            });
        }

        if (sortField) {
            result.sort((a, b) => {
                let valA: number | string;
                let valB: number | string;
                if (sortField === "product") {
                    valA = (a.product?.name ?? "").toLowerCase();
                    valB = (b.product?.name ?? "").toLowerCase();
                } else if (sortField === "deliveryDate") {
                    // Senza data finiscono in fondo a prescindere dalla direzione (coerente con ProductsTable).
                    valA = a.product?.deliveryDate ? new Date(a.product.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
                    valB = b.product?.deliveryDate ? new Date(b.product.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
                } else if (sortField === "quantity") {
                    valA = a.quantity;
                    valB = b.quantity;
                } else if (sortField === "reserved") {
                    valA = a.reserved;
                    valB = b.reserved;
                } else if (sortField === "available") {
                    valA = a.quantity - a.reserved;
                    valB = b.quantity - b.reserved;
                } else {
                    valA = a.reorderPoint;
                    valB = b.reorderPoint;
                }
                if (valA < valB) return sortDir === "asc" ? -1 : 1;
                if (valA > valB) return sortDir === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [inventory, productFilter, deliveryFrom, deliveryTo, sortField, sortDir, showArchived]);

    const columns: AdminTableColumn<InventoryWithProduct>[] = [
        {
            key: "product",
            header: "Prodotto",
            sortable: true,
            cell: (i) => (
                <span className="font-medium">
                    {i.product?.name || "-"}
                    {i.product?.archivedAt && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
                            Archiviato
                        </span>
                    )}
                </span>
            ),
        },
        {
            key: "deliveryDate",
            header: "Data consegna",
            sortable: true,
            cell: (i) =>
                i.product?.deliveryDate ? (
                    <span className="text-sm text-slate-700">
                        {new Date(i.product.deliveryDate).toLocaleDateString("it-IT")}
                    </span>
                ) : (
                    <span className="text-xs italic text-slate-400">—</span>
                ),
        },
        {
            key: "quantity",
            header: "Quantità",
            sortable: true,
            cell: (i) => (
                <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                        i.quantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                >
                    {i.quantity}
                </span>
            ),
        },
        {
            key: "reserved",
            header: "Riservato",
            sortable: true,
            cell: (i) => i.reserved,
        },
        {
            key: "available",
            header: "Disponibile",
            sortable: true,
            cell: (i) => {
                const available = i.quantity - i.reserved;
                return (
                    <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                            available > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                    >
                        {available}
                    </span>
                );
            },
        },
        {
            key: "reorderPoint",
            header: "Reorder Point",
            sortable: true,
            cell: (i) => i.reorderPoint,
            hideOnMobile: true,
        },
    ];

    // Lista prodotti unici presenti nell'inventario, ordinata per nome.
    const inventoryProducts = useMemo(() => {
        const map = new Map<string, { name: string; deliveryDate: Date | null }>();
        for (const i of inventory) {
            if (i.product && !map.has(i.product.id)) {
                map.set(i.product.id, {
                    name: i.product.name,
                    deliveryDate: i.product.deliveryDate ?? null,
                });
            }
        }
        return Array.from(map.entries())
            .map(([id, v]) => ({ id, name: v.name, deliveryDate: v.deliveryDate }))
            .sort((a, b) => {
                // Sort per data consegna asc (imminente prima); senza data → in fondo;
                // tiebreak per nome.
                const aTs = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
                const bTs = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
                if (aTs !== bTs) return aTs - bTs;
                return a.name.localeCompare(b.name);
            });
    }, [inventory]);

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <RefreshButton />
            </div>

            {/* Filtri — accordion */}
            <div className="mb-4">
                <FiltersAccordion
                    summary={
                        processedInventory.length !== inventory.length
                            ? `(${processedInventory.length} di ${inventory.length} righe)`
                            : undefined
                    }
                    onReset={resetFilters}
                    canReset={filtersActive}
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                        <Combobox
                            className="w-full sm:w-72"
                            value={productFilter}
                            onChange={setProductFilter}
                            placeholder="Tutti i prodotti"
                            options={inventoryProducts.map((p) => ({
                                value: p.id,
                                label: p.deliveryDate
                                    ? `${p.name} (cons. ${new Date(p.deliveryDate).toLocaleDateString("it-IT")})`
                                    : p.name,
                            }))}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs text-slate-500">Data consegna — Da</label>
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
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(e) => setShowArchived(e.target.checked)}
                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Mostra archiviati
                        </label>
                    </div>
                </FiltersAccordion>
            </div>

            <AdminTable
                rows={processedInventory}
                columns={columns}
                rowKey={(i) => i.id}
                onRowClick={(i) => openModal(i)}
                emptyMessage="Nessun inventario trovato."
                sortField={sortField ?? undefined}
                sortDir={sortDir}
                onSort={handleSort}
                renderActions={(item) => (
                    <button
                        onClick={() => openModal(item)}
                        className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                    >
                        Modifica
                    </button>
                )}
            />

            {/* Modal */}
            <AdminModal
                isOpen={modalOpen}
                onClose={closeModal}
                title="Gestione Inventario"
            >
                <InventoryForm
                    key={selectedInventory?.id ?? "new"}
                    inventory={selectedInventory}
                    onCancel={closeModal}
                    onSuccess={undefined}
                />
            </AdminModal>
        </>
    );
}
