import { UserRole, validateAuthFromServerSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import { shopVisibilityCutoff } from "@/lib/shop-visibility";
import ShopList from "./ShopList";

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
  // Auto-hide dei prodotti la cui data di consegna è già passata o entro il
  // buffer configurato via env (vedi `lib/shop-visibility.ts`). I prodotti
  // senza deliveryDate restano sempre visibili (campo opzionale).
  // Filtro inoltre fuori i prodotti archiviati (Step 10): l'archiviazione
  // nasconde dallo shop senza eliminarli (storico ordini intatto via snapshot).
  // Sort: per deliveryDate asc (consegna più imminente prima); i prodotti
  // senza data finiscono in fondo (nulls: "last").
  const cutoff = shopVisibilityCutoff();
  return prisma.product.findMany({
    where: {
      archivedAt: null,
      OR: [
        { deliveryDate: null },
        { deliveryDate: { gte: cutoff } },
      ],
    },
    include: { inventory: true },
    orderBy: [{ deliveryDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
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
        <ShopList products={products} />
      </main>
    </div>
  );
}
