"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "CUSTOMER" | "ADMIN";
  createdAt: Date;
}

export default function UserActionsCell({ user }: { user: User }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editName, setEditName] = useState(user.name || "");
  const [editEmail, setEditEmail] = useState(user.email);
  const [editRole, setEditRole] = useState<"CUSTOMER" | "ADMIN">(user.role);
  const [editPassword, setEditPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          ...(editPassword && { password: editPassword }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Errore durante l'aggiornamento.");
        return;
      }

      setSuccess("Utente aggiornato con successo.");
      setIsEditOpen(false);
      router.refresh();
    } catch {
      setError("Errore di rete. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'utente ${user.email}?`)) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Errore durante l'eliminazione.");
        return;
      }

      router.refresh();
    } catch {
      setError("Errore di rete. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Modifica utente</h2>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-lg bg-red-100 border border-red-300 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 rounded-lg bg-emerald-100 border border-emerald-300 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4 px-6 py-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700">
                Nome
              </label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="edit-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="edit-password" className="block text-sm font-medium text-slate-700">
                Nuova password (opzionale)
              </label>
              <input
                id="edit-password"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Lascia vuoto per non cambiarla"
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="edit-role" className="block text-sm font-medium text-slate-700">
                Ruolo
              </label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as "CUSTOMER" | "ADMIN")}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isLoading ? "Aggiornamento..." : "Aggiorna"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setIsEditOpen(true)}
        className="rounded px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
      >
        Modifica
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
      >
        {isDeleting ? "Eliminazione..." : "Elimina"}
      </button>
    </div>
  );
}
