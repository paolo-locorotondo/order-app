import Link from "next/link";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";

export const revalidate = 10;

async function getProducts() {
  return prisma.product.findMany({ include: { inventory: true }, orderBy: { createdAt: "desc" } });
}

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Prodotti</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: (typeof products)[number]) => (
            <article key={product.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <p className="text-slate-600">{product.description ?? "Nessuna descrizione"}</p>
              <p className="mt-2 font-bold">€{product.price.toFixed(2)}</p>
              <p className="text-sm text-slate-500">Disponibilità: {product.inventory?.quantity ?? 0}</p>
              <Link href={`/shop/products/${product.id}`} className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                Visualizza
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
