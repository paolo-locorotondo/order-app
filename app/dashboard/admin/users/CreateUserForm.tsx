"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/app/generated/prisma/enums";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
}

interface CreateUserFormProps {
  user?: User;         // se presente → modalità modifica
  onCancel?: () => void;
}

export default function CreateUserForm({ user, onCancel }: CreateUserFormProps) {
  const isEdit = !!user;
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user?.role || UserRole.CUSTOMER);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset quando cambia l'utente selezionato
  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPassword("");
    setConfirmPassword("");
    setRole(user?.role || UserRole.CUSTOMER);
    setError("");
    setSuccess("");
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isEdit && password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    if (isEdit && password && password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    setIsLoading(true);

    try {
      const url = isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          ...(!isEdit && { password }),
          ...(isEdit && password && { password }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || (isEdit ? "Errore durante l'aggiornamento." : "Impossibile creare l'utente."));
        return;
      }

      setSuccess(isEdit ? "Utente aggiornato con successo." : "Utente creato con successo.");

      if (!isEdit) {
        // Reset del form solo in creazione
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setRole(UserRole.CUSTOMER);
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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isEdit ? `Modifica: ${user!.name || user!.email}` : "Crea nuovo utente"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isEdit
              ? "Modifica i dati dell'account. Lascia la password vuota per non cambiarla."
              : "Aggiungi un nuovo account con email e password."}
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

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mario Rossi"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            {isEdit ? "Nuova password (opzionale)" : "Password"}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? "Lascia vuoto per non cambiarla" : "••••••••"}
            required={!isEdit}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Conferma password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required={!isEdit}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-slate-700">Ruolo</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={inputClass}
          >
            <option value={UserRole.CUSTOMER}>Customer</option>
            <option value={UserRole.ADMIN}>Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {isLoading
            ? isEdit ? "Aggiornamento..." : "Creazione in corso..."
            : isEdit ? "Aggiorna utente" : "Crea utente"}
        </button>
      </form>
    </div>
  );
}
