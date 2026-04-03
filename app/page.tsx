import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Order App</h1>
        <p className="mt-4 text-lg text-slate-700">
          Benvenuto! Usa la navigazione per esplorare prodotti, carrello e dashboard.
        </p>
      </main>
    </div>
  );
}
