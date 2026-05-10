"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import ProductForm, { ProductFormData } from "@/components/ProductForm";
import { ProductModel, InventoryModel } from "@/generated/prisma/models";

interface ProductWithInventory extends ProductModel {
  inventory: InventoryModel | null;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products?page=1");
      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error("Errore caricamento prodotti:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logica identica a ProductDialog
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

        // Per la modifica, aggiorna l'inventario separatamente (come ProductDialog)
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

        await fetchProducts();
        setSelectedProduct(undefined);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Errore sconosciuto");
      } finally {
        setFormLoading(false);
      }
    },
    [selectedProduct]
  );

  const handleDeleteClick = async (id: string) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        if (selectedProduct?.id === id) setSelectedProduct(undefined);
        setDeleteConfirm(null);
      } else {
        alert("Errore eliminazione prodotto");
      }
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore eliminazione prodotto");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin - Prodotti</h1>
            <p className="mt-2 text-sm text-slate-600">
              Gestisci i prodotti. Clicca "Modifica" su una riga per aggiornarlo, o compila il form per crearne uno nuovo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/admin/users"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Gestione Utenti
            </a>
            <a
              href="/dashboard/admin/inventory"
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Gestione Inventario
            </a>
          </div>
        </div>

        {/* ── Layout a griglia ── */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

          {/* Tabella */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Caricamento prodotti...</div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Nessun prodotto. Creane uno con il form →
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</th>
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
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">{product.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{product.slug}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">€{product.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            (product.inventory?.quantity ?? 0) > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.inventory?.quantity ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setFormError(null);
                            }}
                            className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                          >
                            Modifica
                          </button>
                          {deleteConfirm === product.id ? (
                            <>
                              <button
                                onClick={() => handleDeleteClick(product.id)}
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
                  onClick={() => {
                    setSelectedProduct(undefined);
                    setFormError(null);
                  }}
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

            {/* Riusa ProductForm esistente — stessi campi, stessa validazione */}
            <ProductForm
              key={selectedProduct?.id ?? "new"}
              product={selectedProduct}
              onSubmit={handleSubmit}
              loading={formLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
