import Header from "@/components/Header";
import { prisma } from "@/lib/db";
import { UserRole, validateAuthFromServerSession } from "@/lib/auth-helpers";
import AccessDenied from "@/components/AccessDenied";
import CustomerOrdersTable from "./CustomerOrdersTable";

export default async function OrderHistoryPage() {

  const auth = await validateAuthFromServerSession([UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth?.ok) {
    return (
      <AccessDenied errorMessage={auth?.errorResponse ?? "Unauthorized"} />
    );
  }

  const orders = await prisma.order.findMany({
    where: { userId: auth.session.user.id },
    // `product.deliveryDate` serve al filtro "Data consegna" lato client.
    // Niente snapshot su OrderItem: vediamo il valore corrente del prodotto.
    include: { items: { include: { product: { select: { deliveryDate: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Storico ordini</h1>

        {orders.length === 0 ? (
          <p className="mt-4">Non hai ancora ordini.</p>
        ) : (
          <div className="mt-6">
            <CustomerOrdersTable orders={orders} />
          </div>
        )}
      </main>
    </div>
  );
}
