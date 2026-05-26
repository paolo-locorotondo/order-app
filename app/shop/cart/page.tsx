import { validateAuthFromServerSession, UserRole } from "@/lib/auth-helpers";
import Header from "@/components/Header";
import { prisma } from "@/lib/db";
import CartClient from "./CartClient";
import AccessDenied from "@/components/AccessDenied";
import PendingApproval from "@/components/PendingApproval";

interface CartPageProps {
  searchParams?: Promise<{ expired?: string }>;
}

export default async function CartPage({ searchParams }: CartPageProps) {
  const authAny = await validateAuthFromServerSession([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.NUOVO]);
  if (!authAny?.ok) {
    return <AccessDenied errorMessage={authAny?.errorResponse ?? "Unauthorized"} />;
  }
  if (authAny.session.user.role === UserRole.NUOVO) {
    return <PendingApproval />;
  }
  const auth = authAny;

  const items = await prisma.cartItem.findMany({
    where: { userId: auth?.session?.user?.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const params = await searchParams;
  const expiredMessage = params?.expired === "true"
    ? "La sessione di checkout è scaduta. I prodotti non sono più riservati per il checkout."
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Carrello</h1>
        <CartClient initialItems={items} noticeMessage={expiredMessage} />
      </main>
    </div>
  );
}
