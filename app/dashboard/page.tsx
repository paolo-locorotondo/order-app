import Header from "@/components/Header";
import { UserRole, validateAuthFromServerSession } from "@/lib/auth-helpers";
import AccessDenied from "@/components/AccessDenied";

export default async function DashboardPage() {

  const auth = await validateAuthFromServerSession([UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth?.ok) {
    return (
      <AccessDenied errorMessage={auth?.errorResponse ?? "Unauthorized"} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-4">Bentornato, {auth.session.user.name ?? auth.session.user.email}</p>
        <p className="mt-2 text-sm text-slate-600">Role: {auth.session.user.role ?? "unknown"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/dashboard/orders" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Miei Ordini
          </a>
          {auth.session.user.role === UserRole.ADMIN ? (
            <>
              <a href="/dashboard/admin/products" className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
                Gestione Prodotti
              </a>
              <a href="/dashboard/admin/inventory" className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Gestione Inventario
              </a>
              <a href="/dashboard/admin/orders" className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700">
                Gestione Ordini
              </a>
              <a href="/dashboard/admin/users" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Gestione Utenti
              </a>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
