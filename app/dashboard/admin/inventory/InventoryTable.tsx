"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InventoryForm from "./InventoryForm";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
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

    const columns: AdminTableColumn<InventoryWithProduct>[] = [
        {
            key: "product",
            header: "Prodotto",
            cell: (i) => <span className="font-medium">{i.product?.name || "-"}</span>,
        },
        {
            key: "quantity",
            header: "Quantità",
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
            cell: (i) => i.reserved,
        },
        {
            key: "reorderPoint",
            header: "Reorder Point",
            cell: (i) => i.reorderPoint,
            hideOnMobile: true,
        },
    ];

    return (
        <>
            {/* TODO Filtri*/}

            <AdminTable
                rows={inventory}
                columns={columns}
                rowKey={(i) => i.id}
                onRowClick={(i) => openModal(i)}
                emptyMessage="Nessun inventario trovato."
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
