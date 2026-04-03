import Header from "@/components/Header";
import AddToCartForm from "@/components/AddToCartForm";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function ProductPage({ params }: Props) {
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 rounded border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-slate-600">{product.description ?? "Nessuna descrizione"}</p>
            <p className="mt-2 text-lg font-semibold">€{product.price.toFixed(2)}</p>
            <p className="text-sm text-slate-600">
              Disponibilità: {product.inventory?.quantity ?? 0}
            </p>
            <AddToCartForm productId={product.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
