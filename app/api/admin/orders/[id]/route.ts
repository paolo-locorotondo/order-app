import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  address: z.string().min(10, "Indirizzo deve essere almeno 10 caratteri").optional(),
  paymentMethod: z.enum(["stripe", "paypal", "cash"]).optional(),
});

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

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const params = await context.params;
  const body = await request.json();
  const parsed = updateOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.address && { address: parsed.data.address }),
      ...(parsed.data.paymentMethod && { paymentMethod: parsed.data.paymentMethod }),
    },
    include: { items: { include: { product: true } }, user: true },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const params = await context.params;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Restore inventory per ogni OrderItem
  await Promise.all(
    order.items.map((item) =>
      prisma.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { increment: item.quantity } },
      }),
    ),
  );

  // Delete OrderItems
  await prisma.orderItem.deleteMany({
    where: { orderId: params.id },
  });

  // Delete Order
  await prisma.order.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ message: "Order deleted successfully" });
}
