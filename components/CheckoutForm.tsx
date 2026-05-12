"use client";

import { useState } from "react";

export interface CheckoutFormData {
  address: string;
  paymentMethod: "cash" | "stripe" | "paypal"; // TODO usare enum prisma PaymentMethods
}

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  loading?: boolean;
}

export default function CheckoutForm({ onSubmit, loading = false }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    address: "",
    paymentMethod: "cash",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.address.trim()) newErrors.address = "Indirizzo richiesto";
    if (formData.address.trim().length < 10) newErrors.address = "Indirizzo deve essere almeno 10 caratteri";
    if (!formData.paymentMethod) newErrors.paymentMethod = "Metodo di pagamento richiesto";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      {/* Indirizzo Spedizione */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
          Indirizzo di Spedizione *
        </label>
        <textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            errors.address ? "border-red-500" : "border-slate-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="Via, numero civico, città, provincia, CAP"
          disabled={loading}
        />
        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
      </div>

      {/* Metodo di Pagamento */}
      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700 mb-2">
          Metodo di Pagamento *
        </label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            errors.paymentMethod ? "border-red-500" : "border-slate-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          disabled={loading}
        >
          <option value="cash">Contrassegno (Pagamento alla consegna)</option>
          <option value="stripe">Carta di Credito (Stripe)</option>
          <option value="paypal">PayPal</option>
        </select>
        {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
      </div>

      {/* Info */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        ℹ️ <strong>Nota:</strong> Attualmente è disponibile solo il metodo "Contrassegno". Gli altri metodi verranno presto integrati.
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Elaborazione..." : "Conferma Ordine"}
      </button>
    </form>
  );
}
