"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import CreateUserForm from "./CreateUserForm";
import AdminModal from "@/components/AdminModal";
import AdminTable, { AdminTableColumn } from "@/components/AdminTable";
import RefreshButton from "@/components/RefreshButton";
import FiltersAccordion from "@/components/FiltersAccordion";
import WhatsAppButton from "@/components/WhatsAppButton";
import { apiFetch } from "@/lib/fetch";
import { UserRole } from "@/app/generated/prisma/enums";
import { greetingMessage } from "@/lib/whatsapp";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  phoneNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-purple-100 text-purple-900",
  [UserRole.CUSTOMER]: "bg-slate-100 text-slate-900",
  [UserRole.NUOVO]: "bg-amber-100 text-amber-900",
};

type SortField = "name" | "email" | "role" | "createdAt" | "updatedAt";
type SortDir = "asc" | "desc";

export default function UsersTable({ users }: { users: User[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);

  const [searchFilter, setSearchFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [dateField, setDateField] = useState<"createdAt" | "updatedAt">("createdAt");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Selezione multipla per azioni bulk. La selezione viene auto-pruned alla
  // soltanto le righe visibili (vedi useEffect più sotto): quando l'admin
  // cambia filtri, gli id non più visibili escono automaticamente dal set.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkRole, setBulkRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleSort = (key: string) => {
    const field = key as SortField;
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

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

  const handleApprove = async (id: string) => {
    setApproveLoading(id);
    try {
      const response = await apiFetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: UserRole.CUSTOMER }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || "Errore durante l'approvazione.");
        return;
      }
      router.refresh();
    } catch {
      alert("Errore di rete. Riprova più tardi.");
    } finally {
      setApproveLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const response = await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
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

    if (sortField) {
      result.sort((a, b) => {
        let valA: number | string;
        let valB: number | string;
        if (sortField === "name") {
          valA = (a.name ?? "").toLowerCase();
          valB = (b.name ?? "").toLowerCase();
        } else if (sortField === "email") {
          valA = a.email.toLowerCase();
          valB = b.email.toLowerCase();
        } else if (sortField === "role") {
          valA = a.role;
          valB = b.role;
        } else if (sortField === "createdAt") {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
        } else {
          valA = new Date(a.updatedAt).getTime();
          valB = new Date(b.updatedAt).getTime();
        }
        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, searchFilter, roleFilter, dateField, dateFrom, dateTo, sortField, sortDir]);

  // Auto-prune della selezione: quando processedUsers cambia (filtri/ricerca),
  // rimuovo dal set gli id non più visibili. Decisione UX: l'azione bulk deve
  // operare solo sulle righe attualmente visibili (no ghost edit di righe
  // selezionate prima del filtro). Vedi discussione TODO Step #9.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(processedUsers.map((u) => u.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleIds.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [processedUsers]);

  const allVisibleSelected =
    processedUsers.length > 0 &&
    processedUsers.every((u) => selectedIds.has(u.id));

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        // Tutti i visibili erano selezionati → li deseleziono.
        const next = new Set(prev);
        for (const u of processedUsers) next.delete(u.id);
        return next;
      }
      // Aggiungi tutti i visibili al set.
      const next = new Set(prev);
      for (const u of processedUsers) next.add(u.id);
      return next;
    });
  };

  const handleBulkRoleChange = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!confirm(`Confermi cambio ruolo a ${bulkRole} per ${ids.length} ${ids.length === 1 ? "utente" : "utenti"}?`)) {
      return;
    }
    setBulkLoading(true);
    try {
      const response = await apiFetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, role: bulkRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || "Errore durante l'aggiornamento bulk.");
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

  const columns: AdminTableColumn<User>[] = [
    {
      key: "name",
      header: "Nome",
      sortable: true,
      cell: (u) => <span className="font-medium">{u.name || "-"}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      cell: (u) => u.email,
    },
    {
      key: "role",
      header: "Ruolo",
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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

        {/* Action bar bulk: appare quando ≥1 utente selezionato */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
            <span className="font-medium text-blue-900">
              {selectedIds.size} {selectedIds.size === 1 ? "utente selezionato" : "utenti selezionati"}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-600">Cambia ruolo a</label>
              <select
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value as UserRole)}
                disabled={bulkLoading}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none disabled:opacity-50"
              >
                {Object.values(UserRole).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkRoleChange}
                disabled={bulkLoading}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkLoading ? "..." : "Applica"}
              </button>
            </div>
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
          rows={processedUsers}
          columns={columns}
          rowKey={(u) => u.id}
          onRowClick={(u) => openModal(u)}
          emptyMessage="Nessun utente trovato."
          sortField={sortField ?? undefined}
          sortDir={sortDir}
          onSort={handleSort}
          selectable
          selectedIds={selectedIds}
          onToggleRowSelection={toggleRowSelection}
          onToggleAllVisible={toggleAllVisible}
          renderActions={(user) => (
            <>
              {user.role === UserRole.NUOVO && (
                <button
                  onClick={() => handleApprove(user.id)}
                  disabled={approveLoading === user.id}
                  className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  title="Promuove a CUSTOMER"
                >
                  {approveLoading === user.id ? "..." : "Approva"}
                </button>
              )}
              <WhatsAppButton
                phoneNumber={user.phoneNumber}
                message={greetingMessage(user.name)}
                title={`Apri chat WhatsApp con ${user.name || user.email}`}
              />
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
          onSuccess={undefined}
        />
      </AdminModal>
    </>
  );
}
