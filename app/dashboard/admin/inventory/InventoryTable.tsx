"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InventoryForm from "./InventoryForm";
import AdminModal from "@/components/AdminModal";
import { InventoryModel, ProductModel } from "@/app/generated/prisma/models";

interface InventoryWithProduct extends InventoryModel {
    product: ProductModel | null;
}

export default function InventoryTable({ inventory }: { inventory: InventoryWithProduct[] }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState<InventoryWithProduct | undefined>();
    const router = useRouter();

    const openModal = (inv?: InventoryWithProduct) => {
        setSelectedInventory(inv);
        setModalOpen(true);
    };

    const closeModal = () => {
        setSelectedInventory(undefined);
        setModalOpen(false);
    };

    return (
        <>
            {/* TODO Filtri*/}

            {/* Tabella */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                {inventory.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                        Nessun inventario trovato.
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prodotto</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Quantità</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Riservato</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reorder Point</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {inventory.map((item) => (
                                <tr
                                    key={item.id} className="hover:bg-slate-50"
                                    onClick={() => openModal(item)}
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{item.product?.name || "-"}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">
                                        <span className={`rounded px-2 py-1 text-xs font-medium ${item.quantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                            }`}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{item.reserved}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{item.reorderPoint}</td>
                                    <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-wrap gap-1">
                                            <button
                                                onClick={() => openModal(item)}
                                                className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                                            >
                                                Modifica
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            <AdminModal
                isOpen={modalOpen}
                onClose={closeModal}
                /* title={selectedInventory ? `Modifica: ${selectedInventory.product?.name}` : "Nuovo Inventario"} */
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
