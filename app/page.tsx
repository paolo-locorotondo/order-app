import Header from "@/components/Header";
import Link from "next/link";
import { isAuthenticatedFromServerSession } from "@/lib/auth-helpers";
import { RestartTourButton } from "@/components/Tour";

export default async function Home() {
  const isAuthenticated = await isAuthenticatedFromServerSession();

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

        {/* CTA login: solo per utenti non autenticati. Già loggati hanno il menu nell'Header. */}
        {!isAuthenticated && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-base text-slate-800">
              Per ordinare un prodotto effettua prima il{" "}
              <Link href="/auth/login" className="font-semibold text-blue-700 underline hover:text-blue-900">
                login
              </Link>
              {" "}o{" "}
              <Link href="/auth/register" className="font-semibold text-blue-700 underline hover:text-blue-900">
                registrati
              </Link>
              {" "}se non hai ancora un account.
            </p>
          </div>
        )}

        <div className="mt-6">
          <RestartTourButton />
        </div>
      </main>
    </div>
  );
}
