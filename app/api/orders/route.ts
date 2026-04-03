import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";

const orderSchema = z.object({
  address: z.string().min(5),
  paymentMethod: z.enum(["stripe", "paypal", "cash"]).optional().default("cash"),
});

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: token.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: orders });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: token.id },
    include: { product: true },
  });

  if (cartItems.length === 0) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const total = cartItems.reduce((sum: number, item: (typeof cartItems)[number]) => sum + item.quantity * item.product.price, 0);

  const created = await prisma.order.create({
    data: {
      userId: token.id,
      total,
      status: "PENDING",
      stripePaymentId: null,
      items: {
        create: cartItems.map((item: (typeof cartItems)[number]) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        })),
      },
    },
    include: { items: true },
  });

  // Update inventory
  await Promise.all(
    cartItems.map((item: (typeof cartItems)[number]) =>
      prisma.inventory.updateMany({
        where: { productId: item.productId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } },
      }),
    ),
  );

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { userId: token.id } });

  return NextResponse.json({ data: created }, { status: 201 });
}
