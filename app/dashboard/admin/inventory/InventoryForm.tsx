"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InventoryModel, ProductModel } from "@/app/generated/prisma/models";

interface InventoryWithProduct extends InventoryModel {
  product: ProductModel | null;
}

interface InventoryFormProps {
  inventory?: InventoryWithProduct;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export default function InventoryForm({ inventory, onCancel, onSuccess }: InventoryFormProps) {
  const isEdit = !!inventory;
  const router = useRouter();

  const [quantity, setQuantity] = useState(inventory?.quantity || 0);
  const [reserved, setReserved] = useState(inventory?.reserved || 0);
  const [reorderPoint, setReorderPoint] = useState(inventory?.reorderPoint || 10);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setQuantity(inventory?.quantity || 0);
    setReserved(inventory?.reserved || 0);
    setReorderPoint(inventory?.reorderPoint || 10);
    setError("");
    setSuccess("");
  }, [inventory?.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isEdit) {
      setError("Impossibile creare nuovo inventario. Associa a un prodotto tramite la gestione prodotti.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/inventory/${inventory!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          reserved,
          reorderPoint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Errore durante l'aggiornamento.");
        return;
      }

      setSuccess("Inventario aggiornato con successo.");

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }

      router.refresh();
    } catch {
      setError("Errore di rete. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500/20";

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isEdit ? `Modifica: ${inventory!.product?.name}` : "Gestisci Inventario"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isEdit
              ? "Aggiorna la quantità e i parametri di inventario."
              : "Seleziona un prodotto dalla tabella per gestire il suo inventario."}
          </p>
        </div>
        {isEdit && onCancel && (
          <button
            onClick={onCancel}
            className="ml-4 text-sm text-slate-400 hover:text-slate-600"
          >
            ✕ Annulla
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {isEdit ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantità</label>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="reserved" className="block text-sm font-medium text-slate-700">Riservato</label>
            <input
              id="reserved"
              type="number"
              value={reserved}
              onChange={(e) => setReserved(parseInt(e.target.value) || 0)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="reorderPoint" className="block text-sm font-medium text-slate-700">Reorder Point</label>
            <input
              id="reorderPoint"
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(parseInt(e.target.value) || 10)}
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Aggiornamento in corso..." : "Aggiorna inventario"}
          </button>
        </form>
      ) : (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-600">Seleziona un prodotto dalla tabella per modificare l'inventario.</p>
        </div>
      )}
    </div>
  );
}
