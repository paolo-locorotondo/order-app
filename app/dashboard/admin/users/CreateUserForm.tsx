"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/app/generated/prisma/enums";
import FormFeedback from "@/components/FormFeedback";
import PasswordInput from "@/components/PasswordInput";
import { apiFetch } from "@/lib/fetch";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
}

interface CreateUserFormProps {
  user?: User;         // se presente → modalità modifica
  onSuccess?: () => void;
}

export default function CreateUserForm({ user, onSuccess }: CreateUserFormProps) {
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

      const response = await apiFetch(url, {
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

      // Chiama callback di successo se fornito
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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        {isEdit ? `Modifica: ${user!.name || user!.email}` : "Crea nuovo utente"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {isEdit
          ? "Modifica i dati dell'account. Lascia la password vuota per non cambiarla."
          : "Aggiungi un nuovo account con email e password."}
      </p>

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
          <PasswordInput
            id="password"
            variant="light"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? "Lascia vuoto per non cambiarla" : "••••••••"}
            required={!isEdit}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Conferma password
          </label>
          <PasswordInput
            id="confirmPassword"
            variant="light"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required={!isEdit}
            autoComplete="new-password"
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
            <option value={UserRole.NUOVO}>Nuovo (in attesa di approvazione)</option>
            <option value={UserRole.CUSTOMER}>Customer</option>
            <option value={UserRole.ADMIN}>Admin</option>
          </select>
        </div>

        <FormFeedback error={error} success={success} className="mt-4" />

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
