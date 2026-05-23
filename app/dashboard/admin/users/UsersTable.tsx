"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateUserForm from "./CreateUserForm";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import { UserRole } from "@/app/generated/prisma/enums";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export default function UsersTable({ users }: { users: User[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  const openModal = (user?: User) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedUser(undefined);
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || "Errore durante l'eliminazione.");
        return;
      }
      if (selectedUser?.id === id) closeModal();
      setDeleteConfirm(null);
      router.refresh();
    } catch {
      alert("Errore di rete. Riprova più tardi.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: AdminTableColumn<User>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (u) => <span className="font-medium">{u.name || "-"}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (u) => u.email,
    },
    {
      key: "role",
      header: "Ruolo",
      cell: (u) => u.role,
    },
    {
      key: "createdAt",
      header: "Creato il",
      hideOnMobile: true,
      cell: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      {/* Pulsante crea utente */}
      <div className="mb-4 flex justify-center">
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          + Nuovo Utente
        </button>
      </div>

      <AdminTable
        rows={users}
        columns={columns}
        rowKey={(u) => u.id}
        onRowClick={(u) => openModal(u)}
        emptyMessage="Nessun utente trovato."
        renderActions={(user) => (
          <>
            <button
              onClick={() => openModal(user)}
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
          </>
        )}
      />

      {/* Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={selectedUser ? `Modifica: ${selectedUser.name || selectedUser.email}` : "Crea nuovo utente"}
      >
        <CreateUserForm
          key={selectedUser?.id ?? "new"}
          user={selectedUser}
          onCancel={closeModal}
          onSuccess={undefined}
        />
      </AdminModal>
    </>
  );
}
