"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AddToCartForm from "@/app/shop/products/[id]/AddToCartForm";
import FiltersAccordion from "@/components/FiltersAccordion";
import Combobox from "@/components/Combobox";
import RefreshButton from "@/components/RefreshButton";
import { getProductImage } from "@/lib/product-image";
import { ProductModel, InventoryModel } from "@/app/generated/prisma/models";

interface ProductWithInventory extends ProductModel {
    inventory: InventoryModel | null;
}

export default function ShopList({ products }: { products: ProductWithInventory[] }) {
    const [productFilter, setProductFilter] = useState<string>("");
    const [deliveryFrom, setDeliveryFrom] = useState<string>("");
    const [deliveryTo, setDeliveryTo] = useState<string>("");

    const filtersActive = productFilter !== "" || deliveryFrom !== "" || deliveryTo !== "";
    const resetFilters = () => {
        setProductFilter("");
        setDeliveryFrom("");
        setDeliveryTo("");
    };

    // Lista per la Combobox: ordinata per data consegna asc (imminente prima);
    // i prodotti senza data finiscono in fondo. Indipendente dall'ordinamento
    // del grid (che riflette il sort server-side).
    const productsForCombobox = useMemo(() => {
        return [...products].sort((a, b) => {
            const aTs = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
            const bTs = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Number.POSITIVE_INFINITY;
            if (aTs !== bTs) return aTs - bTs;
            return a.name.localeCompare(b.name);
        });
    }, [products]);

    const processedProducts = useMemo(() => {
        let result = products;

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

        return result;
    }, [products, productFilter, deliveryFrom, deliveryTo]);

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <RefreshButton />
            </div>

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
                    </div>
                </FiltersAccordion>
            </div>

            {processedProducts.length === 0 ? (
                <p className="text-sm text-slate-500">Nessun prodotto corrisponde ai filtri.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {processedProducts.map((product) => (
                        <article key={product.id} className="flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
                            <div className="aspect-square w-full overflow-hidden bg-slate-100">
                                <img
                                    src={getProductImage(product.image)}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                            <div className="flex flex-1 flex-col p-4">
                                <h2 className="text-xl font-semibold">{product.name}</h2>
                                {product.deliveryDate && (
                                    <p className="text-xs text-slate-500">
                                        Consegna: {new Date(product.deliveryDate).toLocaleDateString("it-IT")}
                                    </p>
                                )}
                                <p className="mt-2 font-bold">€{product.price.toFixed(2)}</p>
                                <p className="text-sm text-slate-500">Disponibilità: {product.inventory?.quantity ?? 0}</p>
                                <div className="mt-3">
                                    <Link href={`/shop/products/${product.id}`} className="inline-block rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                                        Visualizza
                                    </Link>
                                </div>
                                <AddToCartForm productId={product.id} maxQty={product.inventory?.quantity ?? 0} />
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    );
}
