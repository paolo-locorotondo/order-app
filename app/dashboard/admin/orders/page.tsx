import { UserRole, validateAuthFromServerSession } from "@/lib/auth-helpers";
import Header from "@/components/Header";
import { prisma } from "@/lib/db";
import OrdersTable from "./OrdersTable";
import AccessDenied from "@/components/AccessDenied";

export default async function AdminOrders() {
    const auth = await validateAuthFromServerSession(UserRole.ADMIN);
    if (!auth?.ok) {
        return <AccessDenied errorMessage={auth?.errorResponse ?? "Unauthorized"} />;
    }

    // Fetch parallelo per ridurre la latenza
    const [orders, users, products] = await Promise.all([
        prisma.order.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                items: { include: { product: true } },
                user: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.user.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true, email: true },
        }),
        prisma.product.findMany({
            orderBy: { name: "asc" },
            include: { inventory: true },
        }),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Admin - Ordini</h1>
                        <p className="mt-2 text-sm text-slate-600">
                            Gestisci gli ordini dei clienti. Clicca su una riga per visualizzare dettagli e modificare lo status, o compila il form per crearne uno nuovo.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a href="/dashboard/orders" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                            Miei Ordini
                        </a>
                        <a href="/dashboard/admin/users" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                            Gestione Utenti
                        </a>
                        <a href="/dashboard/admin/products" className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
                            Gestione Prodotti
                        </a>
                        <a href="/dashboard/admin/inventory" className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                            Gestione Inventario
                        </a>
                    </div>
                </div>
                <OrdersTable orders={orders} users={users} products={products} />
            </main>
        </div>
    );
}
