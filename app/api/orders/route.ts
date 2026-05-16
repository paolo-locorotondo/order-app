import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

const orderSchema = z.object({
  address: z.string().min(10, "Indirizzo deve essere almeno 10 caratteri"),
  paymentMethod: z.enum(["stripe", "paypal", "cash"]).default("cash"),
});

export async function GET(request: NextRequest) {

  const auth = await validateAuth(request, [UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const orders = await prisma.order.findMany({
    where: { userId: auth.token.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: orders });
}

export async function POST(request: NextRequest) {

  const auth = await validateAuth(request, [UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // TODO capire come mettere tutte queste operazioni a db in una transazione
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: auth.token.id },
    include: { product: { include: { inventory: true } } },
  });

  if (cartItems.length === 0) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  // BUG FIX #5: VALIDATE INVENTORY BEFORE CREATING ORDER
  for (const item of cartItems) {
    const availableQty = item.product.inventory?.quantity ?? 0;
    if (availableQty < item.quantity) {
      return NextResponse.json(
        {
          error: `Quantità non disponibile: ${item.product.name} ha solo ${availableQty} unità disponibili (richieste: ${item.quantity})`,
        },
        { status: 400 }
      );
    }
  }

  const total = cartItems.reduce((sum: number, item: (typeof cartItems)[number]) => sum + item.quantity * item.product.price, 0);

  const created = await prisma.order.create({
    data: {
      userId: auth.token.id,
      total,
      address: parsed.data.address,
      paymentMethod: parsed.data.paymentMethod,
      status: "PENDING", // TODO usare enum prisma
      stripePaymentId: null,
      items: {
        create: cartItems.map((item: (typeof cartItems)[number]) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  // Update inventory - now we know there's enough stock
  await Promise.all(
    cartItems.map((item: (typeof cartItems)[number]) =>
      prisma.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      }),
    ),
  );

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { userId: auth.token.id } });

  return NextResponse.json({ data: created }, { status: 201 });
}
