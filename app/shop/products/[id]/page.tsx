import { validateAuthFromServerSession, UserRole } from "@/lib/auth-helpers";
import Header from "@/components/Header";
import AddToCartForm from "./AddToCartForm";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import AccessDenied from "@/components/AccessDenied";
import PendingApproval from "@/components/PendingApproval";
import { getProductImage } from "@/lib/product-image";
import { shopVisibilityCutoff } from "@/lib/shop-visibility";

type Props = { params: Promise<{ id: string }> };

export default async function ProductPage({ params }: Props) {

  const auth = await validateAuthFromServerSession([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.NUOVO]);
  if (!auth?.ok) {
    return (
      <AccessDenied errorMessage={auth?.errorResponse ?? "Unauthorized"} />
    );
  }
  if (auth.session.user.role === UserRole.NUOVO) {
    return <PendingApproval />;
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { inventory: true },
  });

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Prodotto non trovato.</p>
        </main>
      </div>
    );
  }

  // Auto-hide dei prodotti scaduti / entro il buffer SHOP_HIDE_BEFORE_HOURS:
  // stessa policy della lista shop. L'admin che vuole comunque vederlo lo
  // trova nella tabella admin.
  if (product.deliveryDate && new Date(product.deliveryDate) < shopVisibilityCutoff()) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full overflow-hidden rounded border bg-white shadow-sm lg:w-1/2 lg:max-w-md">
            <div className="aspect-square w-full bg-slate-100">
              <img
                src={getProductImage(product.image)}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="flex-1 rounded border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            {product.deliveryDate && (
              <p className="mt-1 text-sm text-slate-500">
                Consegna: {new Date(product.deliveryDate).toLocaleDateString("it-IT")}
              </p>
            )}
            <p className="text-slate-600">{product.description ?? "Nessuna descrizione"}</p>
            <p className="mt-2 text-lg font-semibold">€{product.price.toFixed(2)}</p>
            <p className="text-sm text-slate-600">
              Disponibilità: {product.inventory?.quantity ?? 0}
            </p>
            <AddToCartForm productId={product.id} maxQty={product.inventory?.quantity ?? 0} />
            <div className="mt-6 flex flex-wrap gap-4">
              <Link href="/shop" className="text-blue-600 hover:underline">
                ← Continua lo shopping
              </Link>
              <Link href="/shop/cart" prefetch={false} className="text-blue-600 hover:underline">
                Vai al carrello →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
