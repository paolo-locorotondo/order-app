import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";
import { PaymentMethods, OrderStatus } from "@/app/generated/prisma/enums";

const orderSchema = z.object({
  address: z.string().min(10, "Indirizzo deve essere almeno 10 caratteri"),
  paymentMethod: z.enum([PaymentMethods.STRIPE, PaymentMethods.PAYPAL, PaymentMethods.CASH]).default(PaymentMethods.CASH),
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
  const userId = auth.token.id;

  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // 1. Verifica che esista una CartReservation valida per l'utente.
  const reservation = await prisma.cartReservation.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "La prenotazione non è disponibile. Torna al carrello e riprova." },
      { status: 400 }
    );
  }

  if (reservation.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "La prenotazione è scaduta. Torna al carrello e riprova." },
      { status: 400 }
    );
  }

  if (reservation.items.length === 0) {
    return NextResponse.json({ error: "La prenotazione è vuota" }, { status: 400 });
  }

  const total = reservation.items.reduce(
    (sum, item) => sum + item.quantity * item.product.price,
    0
  );

  // 2. Transazione: crea ordine, decrementa quantity e reserved, libera reservation, svuota cart.
  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        total,
        address: parsed.data.address,
        paymentMethod: parsed.data.paymentMethod,
        status: OrderStatus.PENDING,
        stripePaymentId: null,
        items: {
          create: reservation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    for (const item of reservation.items) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: {
          quantity: { decrement: item.quantity },
          reserved: { decrement: item.quantity },
        },
      });
    }

    await tx.cartReservation.delete({ where: { id: reservation.id } });
    await tx.cartItem.deleteMany({ where: { userId } });

    return order;
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
