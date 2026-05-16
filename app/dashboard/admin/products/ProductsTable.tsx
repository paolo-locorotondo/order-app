"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProductForm, { ProductFormData } from "@/components/ProductForm";
import { ProductModel, InventoryModel } from "@/app/generated/prisma/models";

interface ProductWithInventory extends ProductModel {
  inventory: InventoryModel | null;
}

export default function ProductsTable({ products }: { products: ProductWithInventory[] }) {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

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

        setSelectedProduct(undefined);
        router.refresh(); // ricarica i dati dal Server Component
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
      if (selectedProduct?.id === id) setSelectedProduct(undefined);
      setDeleteConfirm(null);
      router.refresh();
    } catch {
      alert("Errore di rete. Riprova più tardi.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

      {/* Tabella */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {products.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Nessun prodotto. Creane uno con il form →
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Sku</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prezzo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className={`hover:bg-slate-50 ${selectedProduct?.id === product.id ? "bg-blue-50" : ""}`}
                  onClick={() => { setSelectedProduct(product); setFormError(null); }}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-700">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{product.sku}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">€{product.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`rounded px-2 py-1 text-xs font-medium ${
                      (product.inventory?.quantity ?? 0) > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {product.inventory?.quantity ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => { setSelectedProduct(product); setFormError(null); }}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form inline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            {selectedProduct ? `Modifica: ${selectedProduct.name}` : "Nuovo Prodotto"}
          </h2>
          {selectedProduct && (
            <button
              onClick={() => { setSelectedProduct(undefined); setFormError(null); }}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ✕ Annulla
            </button>
          )}
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        <ProductForm
          key={selectedProduct?.id ?? "new"}
          product={selectedProduct}
          onSubmit={handleSubmit}
          loading={formLoading}
        />
      </div>
    </div>
  );
}
