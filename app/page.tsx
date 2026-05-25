import Header from "@/components/Header";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Order App</h1>
        <p className="mt-4 text-lg text-slate-700">
          Benvenuto! Usa quest&apos;applicazione per ordinare fantastici prodotti.
        </p>
        <p className="mt-2 text-lg text-slate-700">
          Usa la navigazione tramite il menu in alto per esplorare{" "}
          <Link href="/shop" className="text-blue-600 underline hover:text-blue-800">
            prodotti
          </Link>
          , aggiungerli al{" "}
          <Link href="/shop/cart" prefetch={false} className="text-blue-600 underline hover:text-blue-800">
            carrello
          </Link>
          {" "}e controllare i tuoi ordini nella{" "}
          <Link href="/dashboard" prefetch={false} className="text-blue-600 underline hover:text-blue-800">
            dashboard
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
