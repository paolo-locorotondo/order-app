import Header from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminInventory() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">Accesso negato</h1>
          <p>Devi essere amministratore per visualizzare questa pagina.</p>
        </main>
      </div>
    );
  }

  const inventory = await prisma.inventory.findMany({ include: { product: true }, orderBy: { productId: "asc" } });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Admin - Inventario</h1>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 bg-white">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold">Prodotto</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Quantità</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Riservato</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Reorder Point</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item: (typeof inventory)[number]) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-sm">{item.product?.name ?? "-"}</td>
                  <td className="px-3 py-2 text-sm">{item.quantity}</td>
                  <td className="px-3 py-2 text-sm">{item.reserved}</td>
                  <td className="px-3 py-2 text-sm">{item.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
