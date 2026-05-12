import { UserRole, validateAuthFromServerSession } from "@/lib/auth-helpers";
import Header from "@/components/Header";
import { prisma } from "@/lib/db";
import ProductsTable from "./ProductsTable";
import AccessDenied from "@/components/AccessDenied";

export default async function AdminProducts() {

  const auth = await validateAuthFromServerSession(UserRole.ADMIN);
  if (!auth?.ok) {
    return (
      <AccessDenied errorMessage={auth?.errorResponse ?? "Unauthorized"} />
    );
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { inventory: true },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin - Prodotti</h1>
            <p className="mt-2 text-sm text-slate-600">
              Gestisci i prodotti. Clicca "Modifica" su una riga per aggiornarlo, o compila il form per crearne uno nuovo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/admin/users"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Gestione Utenti
            </a>
            <a
              href="/dashboard/admin/inventory"
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Gestione Inventario
            </a>
          </div>
        </div>

        <ProductsTable products={products} />
      </main>
    </div>
  );
}
