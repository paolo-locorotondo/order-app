import { UserRole, validateAuthFromServerSession } from "@/lib/auth-helpers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import AddToCartForm from "@/app/shop/products/[id]/AddToCartForm";
import { getProductImage } from "@/lib/product-image";

export const revalidate = 10;

async function getProductsLite() {
  return prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      price: true
    },
    //include: { inventory: false },
    orderBy: { createdAt: "desc" }
  })
}

async function getProducts() {
  // Auto-hide dei prodotti la cui data di consegna è già passata: lo shop
  // non deve mostrare prodotti non più ordinabili. Quelli senza deliveryDate
  // restano sempre visibili (campo opzionale).
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return prisma.product.findMany({
    where: {
      OR: [
        { deliveryDate: null },
        { deliveryDate: { gte: todayStart } },
      ],
    },
    include: { inventory: true },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ShopPage() {
  // Questa pagina è pubblica, non serve autenticazione,
  // ma se volessimo nascondere alcune info dei prodotti:
  /* let products = null;
  const auth = await validateAuthFromServerSession([UserRole.ADMIN, UserRole.CUSTOMER]);
    if (!auth?.ok) {
    // per gli utenti non autenticati o con ruolo sconosciuto, mostriamo solo i prodotti senza info sull'inventario
    products = await getProductsLite();
  } else {
    products = await getProducts();
  } */
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Prodotti</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: (typeof products)[number]) => (
            <article key={product.id} className="flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="aspect-square w-full overflow-hidden bg-slate-100">
                <img
                  src={getProductImage(product.image)}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="text-xl font-semibold">{product.name}</h2>
                {product.deliveryDate && (
                  <p className="text-xs text-slate-500">
                    Consegna: {new Date(product.deliveryDate).toLocaleDateString("it-IT")}
                  </p>
                )}
                <p className="mt-2 font-bold">€{product.price.toFixed(2)}</p>
                <p className="text-sm text-slate-500">Disponibilità: {product.inventory?.quantity ?? 0}</p>
                <div className="mt-3">
                  <Link href={`/shop/products/${product.id}`} className="inline-block rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                    Visualizza
                  </Link>
                </div>
                <AddToCartForm productId={product.id} maxQty={product.inventory?.quantity ?? 0} />
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
