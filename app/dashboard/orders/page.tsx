import Header from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function OrderHistoryPage() {
  const session = await getServerSession(authOptions);

  const orders = await prisma.order.findMany({
    where: { userId: session?.user?.id ?? "" },
    include: { items: { include: { product: true } } },
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
          <div className="mt-4 space-y-4">
            {orders.map((order: (typeof orders)[number]) => (
              <article key={order.id} className="rounded border bg-white p-4 shadow-sm">
                <p className="font-semibold">Ordine {order.id}</p>
                <p>Status: {order.status}</p>
                <p>Totale: €{order.total.toFixed(2)}</p>
                <p>Data: {order.createdAt.toLocaleString()}</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                  {order.items.map((item: (typeof order.items)[number]) => (
                    <li key={item.id}>
                      {item.product.name} x {item.quantity} - €{(item.price * item.quantity).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
