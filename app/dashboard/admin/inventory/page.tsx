import { UserRole, validateAuthFromServerSession } from "@/lib/auth-helpers";
import Header from "@/components/Header";
import { prisma } from "@/lib/db";
import InventoryTable from "./InventoryTable";
import AccessDenied from "@/components/AccessDenied";

export default async function AdminInventory() {

  const auth = await validateAuthFromServerSession(UserRole.ADMIN);
  if (!auth?.ok) {
    return (
      <AccessDenied errorMessage={auth?.errorResponse ?? "Unauthorized"} />
    );
  }

  const inventory = await prisma.inventory.findMany({
    include: { product: true },
    orderBy: { productId: "asc" }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin - Inventario</h1>
            <p className="mt-2 text-sm text-slate-600">
              Gestisci lo stato dell'inventario dei prodotti. Clicca "Modifica" su una riga per aggiornarlo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/dashboard/orders" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Miei Ordini
            </a>
            <a
              href="/dashboard/admin/products"
              className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Gestione Prodotti
            </a>
            <a
              href="/dashboard/admin/orders"
              className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Gestione Ordini
            </a>
            <a
              href="/dashboard/admin/users"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Gestione Utenti
            </a>
          </div>
        </div>

        <InventoryTable inventory={inventory} />
      </main>
    </div>
  );
}
