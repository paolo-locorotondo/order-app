import Header from "@/components/Header";
import { prisma } from "@/lib/db";
import { validateAuthFromServerSession, UserRole } from "@/lib/auth-helpers";
import CheckoutClient from "./CheckoutClient";
import Link from "next/link";
import AccessDenied from "@/components/AccessDenied";

export default async function CheckoutPage() {

  const auth = await validateAuthFromServerSession([UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth?.ok) {
    return (
      <AccessDenied errorMessage={auth?.errorResponse ?? "Unauthorized"} />
    );
  }

  // Carrello vuoto → redirect immediato senza mostrare la pagina
  const items = await prisma.cartItem.findMany({
    where: { userId: auth.session?.user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="mt-4 text-slate-600">Il carrello è vuoto.</p>
          <Link href="/shop" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Continua lo shopping
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        <CheckoutClient items={items} />
      </main>
    </div>
  );
}
