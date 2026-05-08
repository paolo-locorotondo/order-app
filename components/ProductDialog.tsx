"use client";

import { useCallback, useState } from "react";
import { ProductModel, InventoryModel } from "@/generated/prisma/models";
import ProductForm, { ProductFormData } from "./ProductForm";

interface ProductDialogProps {
  product?: ProductModel & { inventory: InventoryModel | null };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductDialog({ product, isOpen, onClose, onSuccess }: ProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (formData: ProductFormData) => {
      setLoading(true);
      setError(null);

      try {
        const url = product ? `/api/products/${product.id}` : "/api/products";
        const method = product ? "PUT" : "POST";

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
            ...(method === "POST" && { quantity: formData.quantity }), // Include quantity for POST only
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          // Handle different error formats
          const errorMsg = data.error || `Errore ${response.status}`;
          throw new Error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
        }

        // For PUT, update inventory separately
        if (product && method === "PUT") {
          const inventoryResponse = await fetch(`/api/inventory/${product.inventory?.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: formData.quantity }),
          });

          if (!inventoryResponse.ok) {
            console.warn("Errore aggiornamento inventario");
          }
        }

        onSuccess();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
      } finally {
        setLoading(false);
      }
    },
    [product, onClose, onSuccess]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {product ? "Modifica Prodotto" : "Nuovo Prodotto"}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-500 hover:text-slate-700 text-xl font-bold disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <ProductForm product={product} onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
