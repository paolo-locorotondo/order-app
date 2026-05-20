import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";
import { PaymentMethods, OrderStatus } from "@/app/generated/prisma/enums";

const adminOrderSchema = z.object({
  userId: z.string().min(1, "User ID è obbligatorio"),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().min(1, "Quantità deve essere almeno 1"),
    })
  ).min(1, "Almeno un articolo è richiesto"),
  address: z.string().min(10, "Indirizzo deve essere almeno 10 caratteri"),
  paymentMethod: z.enum([PaymentMethods.STRIPE, PaymentMethods.PAYPAL, PaymentMethods.CASH]).default(PaymentMethods.CASH),
});

export async function GET(request: NextRequest) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const orders = await prisma.order.findMany({
    where: {}, // ll'ADMIN vede tutti gli ordini
    include: { items: { include: { product: true } }, user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: orders });
}

export async function POST(request: NextRequest) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const body = await request.json();

  const parsed = adminOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Verifica che l'utente esista
  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Aggrega quantità per productId: due righe sullo stesso prodotto vanno sommate
  // prima di validare contro l'inventory (es. 5+6 dello stesso prodotto = 11 richiesti).
  const aggregatedQty = new Map<string, number>();
  for (const item of parsed.data.items) {
    aggregatedQty.set(item.productId, (aggregatedQty.get(item.productId) ?? 0) + item.quantity);
  }

  // Valida inventario sulla quantità totale aggregata
  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(aggregatedQty.keys()) } },
    include: { inventory: true },
  });

  for (const [productId, totalQty] of aggregatedQty) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json({ error: `Product ${productId} not found` }, { status: 404 });
    }
    const availableQty = product.inventory?.quantity ?? 0;
    if (availableQty < totalQty) {
      return NextResponse.json(
        {
          error: `Superata disponibilità del prodotto ${product.name}. Disponibili: ${availableQty}, richieste: ${totalQty}`,
        },
        { status: 400 }
      );
    }
  }

  const total = parsed.data.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (item.quantity * (product?.price ?? 0));
  }, 0);

  // Transazione: ordine + decrement inventory atomici
  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: parsed.data.userId,
        total,
        address: parsed.data.address,
        paymentMethod: parsed.data.paymentMethod,
        status: OrderStatus.PENDING,
        stripePaymentId: null,
        items: {
          create: parsed.data.items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: product?.price ?? 0,
            };
          }),
        },
      },
      include: { items: { include: { product: true } }, user: { select: { id: true, name: true, email: true } } },
    });

    // Decrementa una sola volta per productId con la quantità aggregata
    for (const [productId, totalQty] of aggregatedQty) {
      await tx.inventory.update({
        where: { productId },
        data: { quantity: { decrement: totalQty } },
      });
    }

    return order;
  });

  return NextResponse.json({ data: created }, { status: 201 });

}
