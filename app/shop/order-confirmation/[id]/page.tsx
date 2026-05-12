import Link from "next/link";
import Header from "@/components/Header";
import { prisma } from "@/lib/db";
import { validateAuthFromServerSession, UserRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import AccessDenied from "@/components/AccessDenied";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const auth = await validateAuthFromServerSession([UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth?.ok) {
    return (
      <AccessDenied errorMessage={auth?.errorResponse ?? "Unauthorized"} />
    );
  }

  // Fetch ordine con Prisma — verifica che appartenga all'utente (o che sia admin)
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  // Ordine non trovato
  if (!order) notFound();

  // Un utente CUSTOMER può vedere solo i propri ordini
  if (auth.session?.user.role === UserRole.CUSTOMER && order.userId !== auth.session.user.id) {
    notFound(); // non riveliamo che l'ordine esiste ma appartiene a qualcun altro
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4">
          <h1 className="mb-2 text-3xl font-bold text-green-700">✓ Ordine Confermato!</h1>
          <p className="text-green-600">Grazie per il tuo acquisto. Di seguito i dettagli del tuo ordine:</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order Details */}
          <div className="space-y-6 lg:col-span-2">
            {/* Numero Ordine */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">Numero Ordine</h2>
              <p className="font-mono text-2xl text-blue-600">{order.id}</p>
              <p className="mt-2 text-sm text-slate-600">
                Data:{" "}
                {new Date(order.createdAt).toLocaleDateString("it-IT", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Indirizzo Spedizione */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">Indirizzo di Spedizione</h2>
              <p className="whitespace-pre-wrap text-slate-700">{order.address}</p>
            </div>

            {/* Articoli */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">Articoli Ordinati</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-slate-600">Quantità: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{(item.price * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-slate-600">€{item.price.toFixed(2)} cad.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metodo Pagamento */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">Informazioni Pagamento</h2>
              <p className="mb-2 text-slate-700">
                <strong>Metodo:</strong>{" "}
                {order.paymentMethod === "cash"
                  ? "Contrassegno (Pagamento alla consegna)"
                  : order.paymentMethod === "stripe"
                    ? "Carta di Credito"
                    : "PayPal"}
              </p>
              <p className="text-sm text-slate-600">
                {order.paymentMethod === "cash"
                  ? "Pagherai al ritiro del pacco dal corriere."
                  : "Il pagamento è stato elaborato con successo."}
              </p>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">Riepilogo</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotale:</span>
                <span className="font-medium">€{order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Spedizione:</span>
                <span className="font-medium">A calcolarsi</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-bold">
                <span>Totale:</span>
                <span>€{order.total.toFixed(2)}</span>
              </div>
              <div className="pt-3">
                <span className="inline-block rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  Status: {order.status}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Link
                href="/dashboard/orders"
                className="block w-full rounded bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Vai ai Miei Ordini
              </Link>
              <Link
                href="/shop"
                className="block w-full rounded bg-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-300 transition-colors"
              >
                Continua lo Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
