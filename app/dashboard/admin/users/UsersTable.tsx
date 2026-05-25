"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import CreateUserForm from "./CreateUserForm";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import RefreshButton from "@/components/RefreshButton";
import FiltersAccordion from "@/components/FiltersAccordion";
import { UserRole } from "@/app/generated/prisma/enums";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-purple-100 text-purple-900",
  [UserRole.CUSTOMER]: "bg-slate-100 text-slate-900",
};

export default function UsersTable({ users }: { users: User[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchFilter, setSearchFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [dateField, setDateField] = useState<"createdAt" | "updatedAt">("createdAt");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filtersActive =
    searchFilter.trim() !== "" || roleFilter !== "ALL" || dateFrom !== "" || dateTo !== "";

  const resetFilters = () => {
    setSearchFilter("");
    setRoleFilter("ALL");
    setDateField("createdAt");
    setDateFrom("");
    setDateTo("");
  };

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

  const processedUsers = useMemo(() => {
    let result = [...users];

    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== "ALL") {
      result = result.filter((u) => u.role === roleFilter);
    }

    if (dateFrom || dateTo) {
      const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : -Infinity;
      const toTs = dateTo ? new Date(dateTo + "T23:59:59.999").getTime() : Infinity;
      result = result.filter((u) => {
        const t = new Date(dateField === "createdAt" ? u.createdAt : u.updatedAt).getTime();
        return t >= fromTs && t <= toTs;
      });
    }

    return result;
  }, [users, searchFilter, roleFilter, dateField, dateFrom, dateTo]);

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
      cell: (u) => (
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${
            ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-900"
          }`}
        >
          {u.role}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Data creazione",
      hideOnMobile: true,
      cell: (u) => (
        <span className="text-xs text-slate-500">
          {new Date(u.createdAt).toLocaleDateString("it-IT")} -{" "}
          {new Date(u.createdAt).toLocaleTimeString("it-IT")}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Data modifica",
      hideOnMobile: true,
      cell: (u) => (
        <span className="text-xs text-slate-500">
          {new Date(u.updatedAt).toLocaleDateString("it-IT")} -{" "}
          {new Date(u.updatedAt).toLocaleTimeString("it-IT")}
        </span>
      ),
    },
  ];

  return (
    <>
      {/* Azioni: crea utente + refresh */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          + Nuovo Utente
        </button>
        <RefreshButton />
      </div>

      <div className="space-y-4">
        {/* Filtri — accordion */}
        <FiltersAccordion
          summary={
            processedUsers.length !== users.length
              ? `(${processedUsers.length} di ${users.length} utenti)`
              : undefined
          }
          onReset={resetFilters}
          canReset={filtersActive}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Cerca per nome o email..."
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-full sm:w-56"
            />

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={dateField}
                onChange={(e) => setDateField(e.target.value as "createdAt" | "updatedAt")}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
              >
                <option value="createdAt">Data creazione</option>
                <option value="updatedAt">Data modifica</option>
              </select>
              <label className="text-xs text-slate-500">Da</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
              />
              <label className="text-xs text-slate-500">A</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRoleFilter("ALL")}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  roleFilter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                Tutti ({users.length})
              </button>
              {Object.values(UserRole).map((role) => {
                const count = users.filter((u) => u.role === role).length;
                return (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                      roleFilter === role
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {role} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </FiltersAccordion>

        {/* Risultati */}
        {processedUsers.length !== users.length && (
          <p className="text-xs text-slate-500">
            {processedUsers.length} di {users.length} utenti
          </p>
        )}

        <AdminTable
          rows={processedUsers}
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
      </div>

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
