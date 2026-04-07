import Header from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CreateUserForm from "./CreateUserForm";
import UserActionsCell from "./UserActionsCell";

export default async function AdminUsers() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">Accesso negato</h1>
          <p>Devi essere un amministratore per visualizzare questa pagina.</p>
        </main>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin - Utenti</h1>
            <p className="mt-2 text-sm text-slate-600">Gestisci gli account registrati e crea nuovi utenti.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/dashboard/admin/products" className="rounded bg-green-600 px-3 py-2 text-white">
              Prodotti
            </a>
            <a href="/dashboard/admin/inventory" className="rounded bg-emerald-600 px-3 py-2 text-white">
              Inventario
            </a>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{user.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{user.role}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <UserActionsCell user={user} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <CreateUserForm />
          </div>
        </div>
      </main>
    </div>
  );
}
