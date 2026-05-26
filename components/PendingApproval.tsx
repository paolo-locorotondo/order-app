import Header from "./Header";
import Link from "next/link";

export default function PendingApproval() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
                    <h1 className="text-xl font-bold text-amber-900">Account in attesa di approvazione</h1>
                    <p className="mt-2 text-amber-800">
                        Il tuo account è stato creato ma non è ancora stato approvato dall&apos;amministratore.
                    </p>
                    <p className="mt-2 text-amber-800">
                        Finché non sarai approvato puoi solo visitare il catalogo.
                        Riceverai accesso ad acquisti e ordini quando l&apos;admin promuoverà il tuo account.
                    </p>
                    <Link
                        href="/shop"
                        className="mt-4 inline-block rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                        ← Torna allo shop
                    </Link>
                </div>
            </main>
        </div>
    );
}
