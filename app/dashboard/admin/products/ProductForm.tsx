"use client";

import { useState, useEffect } from "react";
import { ProductModel, InventoryModel } from "@/app/generated/prisma/models";
import FormFeedback from "@/components/FormFeedback";
import PriceInput from "@/components/PriceInput";

interface ProductFormProps {
  product?: ProductModel & { inventory: InventoryModel | null };
  onSubmit: (data: ProductFormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  sku: string;
  image: string;
  quantity: number;
  deliveryDate: string; // formato "yyyy-mm-dd" (compatibile con <input type="date">), "" = non specificata
}

// Converte un valore Date (da Prisma) o stringa ISO in "yyyy-mm-dd" locale.
// Ritorna "" se assente o non valido.
const toDateInputValue = (v: Date | string | null | undefined): string => {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function ProductForm({ product, onSubmit, loading = false, error, success }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    price: product?.price || 0,
    sku: product?.sku || "",
    image: product?.image || "",
    quantity: product?.inventory?.quantity || 0,
    deliveryDate: toDateInputValue(product?.deliveryDate),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugChanged, setSlugChanged] = useState(false);

  // Auto-generate slug from name (sia in creazione che in modifica)
  useEffect(() => {
    const generatedSlug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({ ...prev, slug: generatedSlug }));

    // Mostra warning solo in modifica e solo se lo slug è effettivamente cambiato
    if (product && generatedSlug !== product.slug) {
      setSlugChanged(true);
    } else {
      setSlugChanged(false);
    }
  }, [formData.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Nome richiesto";
    if (!formData.slug.trim()) newErrors.slug = "Slug richiesto";
    if (formData.price < 0) newErrors.price = "Prezzo non può essere negativo";
    if (Math.abs(formData.price * 100 - Math.round(formData.price * 100)) >= 1e-6) {
      newErrors.price = "Massimo 2 decimali";
    }
    if (formData.quantity < 0) newErrors.quantity = "Quantità non può essere negativa";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseFloat(value) || 0 : value,
    }));
    // Se l'utente modifica lo slug manualmente, aggiorna il warning
    if (name === "slug" && product) {
      setSlugChanged(value !== product.slug);
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit({
        ...formData,
        sku: formData.sku?.trim() || "",
      });
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ID (solo in modifica, read-only) */}
      {product && (
        <div>
          <label className="block text-sm font-medium text-slate-700">ID</label>
          <p className="mt-1 break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
            {product.id}
          </p>
        </div>
      )}

      {/* Nome */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Nome Prodotto *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            errors.name ? "border-red-500" : "border-slate-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="Es: MacBook Pro"
          disabled={loading}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-slate-700">
          Slug *
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          value={formData.slug}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            errors.slug ? "border-red-500" : slugChanged ? "border-amber-400" : "border-slate-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="macbook-pro"
          disabled={loading}
        />
        {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
        {slugChanged && !errors.slug && (
          <p className="mt-1 text-sm text-amber-600">
            ⚠️ Lo slug è cambiato rispetto all'originale (<code className="bg-amber-50 px-1 rounded">{product?.slug}</code>). Verifica che non sia usato altrove (link, SEO, ecc.).
          </p>
        )}
      </div>

      {/* Descrizione */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Descrizione
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Descrizione del prodotto..."
          disabled={loading}
        />
      </div>

      {/* Prezzo + SKU */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-slate-700">
            Prezzo (€) *
          </label>
          <PriceInput
            id="price"
            name="price"
            value={formData.price}
            onChange={(n) => {
              setFormData((prev) => ({ ...prev, price: n }));
              if (errors.price) setErrors((prev) => ({ ...prev, price: "" }));
            }}
            invalid={!!errors.price}
            disabled={loading}
          />
          {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
        </div>

        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-slate-700">
            SKU
          </label>
          <input
            type="text"
            id="sku"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="SKU-001"
            disabled={loading}
          />
        </div>
      </div>

      {/* Data di consegna */}
      <div>
        <label htmlFor="deliveryDate" className="block text-sm font-medium text-slate-700">
          Data di consegna (opzionale)
        </label>
        <input
          type="date"
          id="deliveryDate"
          name="deliveryDate"
          value={formData.deliveryDate}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      {/* Immagine URL o path relativo */}
      <div>
        <label htmlFor="image" className="block text-sm font-medium text-slate-700">
          Immagine (URL o path)
        </label>
        <input
          type="text"
          id="image"
          name="image"
          value={formData.image}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="/images/product.svg oppure https://example.com/product.jpg"
          disabled={loading}
        />
      </div>

      {/* Quantità */}
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">
          Quantità Inventario *
        </label>
        <input
          type="number"
          id="quantity"
          name="quantity"
          min="0"
          value={formData.quantity}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            errors.quantity ? "border-red-500" : "border-slate-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="0"
          disabled={loading}
        />
        {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
      </div>

      <FormFeedback error={error} success={success} className="mt-2" />

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {loading ? "Salvataggio..." : product ? "Aggiorna" : "Crea"}
        </button>
      </div>
    </form>
  );
}
