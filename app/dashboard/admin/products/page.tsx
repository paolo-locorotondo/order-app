"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ProductDialog from "@/components/ProductDialog";
import { ProductModel, InventoryModel } from "@/generated/prisma/models";

interface ProductWithInventory extends ProductModel {
  inventory: InventoryModel | null;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const handleCreateClick = () => {
    setSelectedProduct(undefined);
    setIsDialogOpen(true);
  };

  const handleEditClick = (product: ProductWithInventory) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
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

  const handleSuccess = () => {
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin - Prodotti</h1>
            <p className="mt-2 text-sm text-slate-600">Gestisci i tuoi prodotti</p>
          </div>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            + Nuovo Prodotto
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-600">Caricamento prodotti...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600">Nessun prodotto. Creane uno!</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Slug</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Prezzo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{product.slug}</td>
                    <td className="px-4 py-3 text-sm">€{product.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          (product.inventory?.quantity ?? 0) > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.inventory?.quantity ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button
                        onClick={() => handleEditClick(product)}
                        className="px-3 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600"
                      >
                        Modifica
                      </button>
                      {deleteConfirm === product.id ? (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleDeleteClick(product.id)}
                            disabled={deleteLoading}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                          >
                            {deleteLoading ? "..." : "Conferma"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 bg-slate-400 text-white rounded text-xs hover:bg-slate-500"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Elimina
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ProductDialog
        product={selectedProduct}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedProduct(undefined);
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
