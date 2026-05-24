"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProductForm, { ProductFormData } from "./ProductForm";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import { ProductModel, InventoryModel } from "@/app/generated/prisma/models";
import { getProductImage } from "@/lib/product-image";

interface ProductWithInventory extends ProductModel {
  inventory: InventoryModel | null;
}

export default function ProductsTable({ products }: { products: ProductWithInventory[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Incrementato dopo creazione riuscita: cambiare il `key` di ProductForm
  // ne forza il remount con stato vuoto (reset dei campi).
  const [createResetCount, setCreateResetCount] = useState(0);
  const router = useRouter();

  const openModal = (product?: ProductWithInventory) => {
    setSelectedProduct(product);
    setFormError(null);
    setFormSuccess(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedProduct(undefined);
    setFormError(null);
    setFormSuccess(null);
    setModalOpen(false);
  };

  const handleSubmit = useCallback(
    async (formData: ProductFormData) => {
      setFormLoading(true);
      setFormError(null);

      try {
        const url = selectedProduct ? `/api/products/${selectedProduct.id}` : "/api/products";
        const method = selectedProduct ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            price: formData.price,
            sku: formData.sku,
            image: formData.image,
            ...(method === "POST" && { quantity: formData.quantity }),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          const errorMsg = data.error || `Errore ${response.status}`;
          throw new Error(typeof errorMsg === "object" ? JSON.stringify(errorMsg) : errorMsg);
        }

        // In modifica, aggiorna l'inventario separatamente
        if (selectedProduct && method === "PUT") {
          const inventoryResponse = await fetch(
            `/api/inventory/${selectedProduct.inventory?.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quantity: formData.quantity }),
            }
          );
          if (!inventoryResponse.ok) {
            console.warn("Errore aggiornamento inventario");
          }
        }

        setFormSuccess(selectedProduct ? "Prodotto aggiornato con successo." : "Prodotto creato con successo.");
        // Refresh la tabella subito: il messaggio di successo resta visibile nel modale
        // finché l'utente non lo chiude manualmente.
        router.refresh();
        // In creazione, reset del form (per consentire creazione consecutiva).
        if (!selectedProduct) {
          setCreateResetCount((n) => n + 1);
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Errore sconosciuto");
      } finally {
        setFormLoading(false);
      }
    },
    [selectedProduct, router]
  );

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        alert(data?.error || "Errore eliminazione prodotto");
        return;
      }
      if (selectedProduct?.id === id) closeModal();
      setDeleteConfirm(null);
      router.refresh();
    } catch {
      alert("Errore di rete. Riprova più tardi.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: AdminTableColumn<ProductWithInventory>[] = [
    {
      key: "image",
      header: "",
      mobileLabel: "Immagine",
      cell: (p) => (
        <img
          src={getProductImage(p.image)}
          alt={p.name}
          className="h-10 w-10 rounded border bg-slate-100 object-cover"
          loading="lazy"
        />
      ),
    },
    {
      key: "name",
      header: "Nome",
      cell: (p) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: "sku",
      header: "Sku",
      cell: (p) => <span className="text-slate-500">{p.sku}</span>,
      hideOnMobile: true,
    },
    {
      key: "price",
      header: "Prezzo",
      cell: (p) => `€${p.price.toFixed(2)}`,
    },
    {
      key: "stock",
      header: "Stock",
      cell: (p) => (
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${
            (p.inventory?.quantity ?? 0) > 0
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {p.inventory?.quantity ?? 0}
        </span>
      ),
    },
  ];

  return (
    <>
      {/* Pulsante crea prodotto */}
      <div className="mb-4 flex justify-center">
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          + Nuovo Prodotto
        </button>
      </div>

      <AdminTable
        rows={products}
        columns={columns}
        rowKey={(p) => p.id}
        onRowClick={(p) => openModal(p)}
        emptyMessage="Nessun prodotto. Creane uno con il pulsante qui sopra."
        renderActions={(product) => (
          <>
            <button
              onClick={() => openModal(product)}
              className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
            >
              Modifica
            </button>
            {deleteConfirm === product.id ? (
              <>
                <button
                  onClick={() => handleDelete(product.id)}
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
                onClick={() => setDeleteConfirm(product.id)}
                className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Elimina
              </button>
            )}
          </>
        )}
      />

      {/* Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={selectedProduct ? `Modifica: ${selectedProduct.name}` : "Nuovo Prodotto"}
      >
        <ProductForm
          key={selectedProduct?.id ?? `new-${createResetCount}`}
          product={selectedProduct}
          onSubmit={handleSubmit}
          loading={formLoading}
          error={formError}
          success={formSuccess}
        />
      </AdminModal>
    </>
  );
}
