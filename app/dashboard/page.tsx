import Header from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-4">Bentornato, {session?.user?.name ?? session?.user?.email}</p>
        <p className="mt-2 text-sm text-slate-600">Role: {session?.user?.role ?? "unknown"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/dashboard/orders" className="rounded bg-blue-600 px-3 py-2 text-white">
            Ordini
          </a>
          {session?.user?.role === "ADMIN" ? (
            <>
              <a href="/dashboard/admin/products" className="rounded bg-green-600 px-3 py-2 text-white">
                Admin Prodotti
              </a>
              <a href="/dashboard/admin/inventory" className="rounded bg-emerald-600 px-3 py-2 text-white">
                Inventario
              </a>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
