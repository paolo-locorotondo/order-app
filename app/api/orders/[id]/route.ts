import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {

  const auth = await validateAuth(request, [UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const params = await context.params;
  
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } }, user: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Admin può vedere tutti gli ordini, CUSTOMER solo i propri
  if (auth.user.role !== UserRole.ADMIN && order.userId !== auth.token.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: order });
}
