import Header from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminProducts() {
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

  const products = await prisma.product.findMany({ include: { inventory: true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Admin - Prodotti</h1>
        <p className="mt-2 text-sm text-slate-600">Puoi gestire qui i prodotti (CRUD via API).</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 bg-white">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold">Nome</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Prezzo</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: (typeof products)[number]) => (
                <tr key={product.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-sm">{product.name}</td>
                  <td className="px-3 py-2 text-sm">€{product.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">{product.inventory?.quantity ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
