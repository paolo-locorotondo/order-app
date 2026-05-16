"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateUserForm from "./CreateUserForm";
import { UserRole } from "@/app/generated/prisma/enums";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export default function UsersTable({ users }: { users: User[] }) {
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || "Errore durante l'eliminazione.");
        return;
      }
      if (selectedUser?.id === id) setSelectedUser(undefined);
      setDeleteConfirm(null);
      router.refresh();
    } catch {
      alert("Errore di rete. Riprova più tardi.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

      {/* Tabella */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ruolo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Creato il</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {users.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-slate-50 ${selectedUser?.id === user.id ? "bg-blue-50" : ""}`}
                onClick={() => setSelectedUser(user)}
              >
                <td className="px-4 py-3 text-sm text-slate-700">{user.name || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{user.email}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{user.role}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                    >
                      Modifica
                    </button>
                    {deleteConfirm === user.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(user.id)}
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
                        onClick={() => setDeleteConfirm(user.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form inline */}
      <div>
        <CreateUserForm
          key={selectedUser?.id ?? "new"}
          user={selectedUser}
          onCancel={() => setSelectedUser(undefined)}
        />
      </div>
    </div>
  );
}
