"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductForm, { ProductFormData } from "./ProductForm";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import RefreshButton from "@/components/RefreshButton";
import FiltersAccordion from "@/components/FiltersAccordion";
import Combobox from "@/components/Combobox";
import { ProductModel, InventoryModel } from "@/app/generated/prisma/models";
import { getProductImage } from "@/lib/product-image";
import { apiFetch } from "@/lib/fetch";

interface ProductWithInventory extends ProductModel {
  inventory: InventoryModel | null;
}

type SortField = "id" | "sku" | "name" | "deliveryDate" | "price" | "stock";
type SortDir = "asc" | "desc";

export default function ProductsTable({ products }: { products: ProductWithInventory[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Selezione multipla per bulk delete con auto-prune (stesso pattern di
  // UsersTable e OrdersTable). Le righe nascoste dai filtri escono dal set.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  // Incrementato dopo creazione riuscita: cambiare il `key` di ProductForm
  // ne forza il remount con stato vuoto (reset dei campi).
  const [createResetCount, setCreateResetCount] = useState(0);
  const router = useRouter();

  const [deliveryFrom, setDeliveryFrom] = useState<string>("");
  const [deliveryTo, setDeliveryTo] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // Toggle "Mostra archiviati" (Step 10). Default: archiviati nascosti.
  const [showArchived, setShowArchived] = useState(false);

  const filtersActive = deliveryFrom !== "" || deliveryTo !== "" || productFilter !== "" || showArchived;
  const resetFilters = () => {
    setDeliveryFrom("");
    setDeliveryTo("");
    setProductFilter("");
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

  const processedProducts = useMemo(() => {
    let result = [...products];

    // Step 10: nascondi archiviati di default. Toggle dedicato nei filtri.
    if (!showArchived) {
      result = result.filter((p) => !p.archivedAt);
    }

    if (productFilter) {
      result = result.filter((p) => p.id === productFilter);
    }

    if (deliveryFrom || deliveryTo) {
      const fromTs = deliveryFrom ? new Date(deliveryFrom + "T00:00:00").getTime() : -Infinity;
      const toTs = deliveryTo ? new Date(deliveryTo + "T23:59:59.999").getTime() : Infinity;
      result = result.filter((p) => {
        if (!p.deliveryDate) return false; // i prodotti senza data sono fuori dal range
        const t = new Date(p.deliveryDate).getTime();
        return t >= fromTs && t <= toTs;
      });
    }

    if (sortField) {
      result.sort((a, b) => {
        let valA: number | string;
        let valB: number | string;
        if (sortField === "deliveryDate") {
          // I prodotti senza data finiscono in fondo a prescindere dalla direzione,
          // così il sort non li mescola con valori reali.
          valA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
          valB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
        } else if (sortField === "price") {
          valA = a.price;
          valB = b.price;
        } else if (sortField === "stock") {
          valA = a.inventory?.quantity ?? 0;
          valB = b.inventory?.quantity ?? 0;
        } else if (sortField === "id") {
          valA = a.id;
          valB = b.id;
        } else if (sortField === "sku") {
          valA = a.sku.toLowerCase();
          valB = b.sku.toLowerCase();
        } else {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        }
        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, productFilter, deliveryFrom, deliveryTo, sortField, sortDir, showArchived]);

  // Auto-prune della selezione: gli id non più visibili escono dal set quando
  // cambiano filtri/sort. Stesso pattern di UsersTable / OrdersTable.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(processedProducts.map((p) => p.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleIds.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [processedProducts]);

  const allVisibleSelected =
    processedProducts.length > 0 &&
    processedProducts.every((p) => selectedIds.has(p.id));

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const p of processedProducts) next.delete(p.id);
        return next;
      }
      const next = new Set(prev);
      for (const p of processedProducts) next.add(p.id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkArchive = async (archive: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const verb = archive ? "Archiviare" : "Ripristinare";
    if (!confirm(`${verb} ${ids.length} ${ids.length === 1 ? "prodotto" : "prodotti"}?`)) {
      return;
    }
    setBulkLoading(true);
    try {
      const response = await apiFetch("/api/admin/products/bulk/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, archive }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || "Errore durante l'operazione bulk.");
        return;
      }
      clearSelection();
      router.refresh();
    } catch {
      alert("Errore di rete. Riprova più tardi.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!confirm(`Eliminare definitivamente ${ids.length} ${ids.length === 1 ? "prodotto" : "prodotti"}? L'operazione fallirà se anche un solo prodotto è presente in ordini storici.`)) {
      return;
    }
    setBulkLoading(true);
    try {
      const response = await apiFetch("/api/admin/products/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || "Errore durante l'eliminazione bulk.");
        return;
      }
      clearSelection();
      router.refresh();
    } catch {
      alert("Errore di rete. Riprova più tardi.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Lista per la Combobox dei filtri: ordinata per data consegna asc (imminente
  // prima); i prodotti senza data finiscono in fondo. Indipendente dal sort
  // colonna scelto dall'utente in tabella.
  const productsForCombobox = useMemo(() => {
    return [...products].sort((a, b) => {
      const aTs = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
      const bTs = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
      if (aTs !== bTs) return aTs - bTs;
      return a.name.localeCompare(b.name);
    });
  }, [products]);

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

        const response = await apiFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            price: formData.price,
            sku: formData.sku,
            image: formData.image,
            deliveryDate: formData.deliveryDate,
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
          const inventoryResponse = await apiFetch(
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
      const response = await apiFetch(`/api/products/${id}`, { method: "DELETE" });
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

  // Ordine colonne richiesto: Immagine | ID | SKU | Nome | Data consegna | Prezzo | Stock | Azioni.
  // Tutte sortable tranne Immagine (visivo).
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
      key: "id",
      header: "ID",
      sortable: true,
      cell: (p) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-mono text-xs text-slate-500">{p.id.slice(0, 8)}</span>
          {p.archivedAt && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
              Archiviato
            </span>
          )}
        </span>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      cell: (p) => <span className="text-slate-500">{p.sku}</span>,
      hideOnMobile: true,
    },
    {
      key: "name",
      header: "Nome",
      sortable: true,
      cell: (p) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: "deliveryDate",
      header: "Data consegna",
      sortable: true,
      cell: (p) =>
        p.deliveryDate ? (
          <span className="text-sm text-slate-700">
            {new Date(p.deliveryDate).toLocaleDateString("it-IT")}
          </span>
        ) : (
          <span className="text-xs italic text-slate-400">—</span>
        ),
    },
    {
      key: "price",
      header: "Prezzo",
      sortable: true,
      cell: (p) => `€${p.price.toFixed(2)}`,
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
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
      {/* Azioni: crea prodotto + refresh */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          + Nuovo Prodotto
        </button>
        <RefreshButton />
      </div>

      {/* Filtri — accordion */}
      <div className="mb-4">
        <FiltersAccordion
          summary={
            processedProducts.length !== products.length
              ? `(${processedProducts.length} di ${products.length} prodotti)`
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
              options={productsForCombobox.map((p) => ({
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

      {/* Action bar bulk: appare quando ≥1 prodotto selezionato */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <span className="font-medium text-blue-900">
            {selectedIds.size} {selectedIds.size === 1 ? "prodotto selezionato" : "prodotti selezionati"}
          </span>
          <button
            type="button"
            onClick={() => handleBulkArchive(true)}
            disabled={bulkLoading}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            title="Archivia i selezionati: nascosti dallo shop e dalle viste admin di default; reversibile."
          >
            {bulkLoading ? "..." : "Archivia"}
          </button>
          <button
            type="button"
            onClick={() => handleBulkArchive(false)}
            disabled={bulkLoading}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            title="Ripristina (dis-archivia) i selezionati."
          >
            {bulkLoading ? "..." : "Ripristina"}
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            title="Elimina i selezionati. L'operazione fallisce se anche un solo prodotto è presente in ordini storici."
          >
            {bulkLoading ? "..." : "Elimina selezionati"}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={bulkLoading}
            className="rounded bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50"
          >
            Annulla selezione
          </button>
        </div>
      )}

      <AdminTable
        rows={processedProducts}
        columns={columns}
        rowKey={(p) => p.id}
        onRowClick={(p) => openModal(p)}
        emptyMessage="Nessun prodotto. Creane uno con il pulsante qui sopra."
        sortField={sortField ?? undefined}
        sortDir={sortDir}
        onSort={handleSort}
        selectable
        selectedIds={selectedIds}
        onToggleRowSelection={toggleRowSelection}
        onToggleAllVisible={toggleAllVisible}
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
