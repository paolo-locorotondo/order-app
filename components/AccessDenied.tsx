"use client";

import Header from "./Header";

interface Props {
    errorMessage: string;
}

export default function AccessDenied({ errorMessage }: Props) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                    <h1 className="text-xl font-bold text-red-900">Accesso Negato</h1>
                    <p className="mt-2 text-red-700">{errorMessage}</p>
                    <p className="mt-2 text-red-700">Non sei autorizzato a visualizzare questa pagina.</p>
                    <p className="mt-2 text-red-700">Se non hai effettuato il login, prova prima ad effettuarlo.</p>
                </div>
            </main>
        </div>
    );
}