import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";
import { PaymentMethods, OrderStatus } from "@/app/generated/prisma/enums";

const orderSchema = z.object({
  // Indirizzo opzionale: ammette stringa vuota oppure almeno 10 caratteri.
  address: z
    .string()
    .refine((v) => v.length === 0 || v.length >= 10, "Indirizzo deve essere almeno 10 caratteri")
    .optional()
    .default(""),
  notes: z.string().max(2000).optional().default(""),
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

  // Step 10: guard archiviazione. Se un prodotto è stato archiviato dall'admin
  // tra reserve e checkout, il finalize fallisce. La reservation resta valida
  // (l'utente può rimuovere l'item archiviato e riprovare). Etichetta col
  // `(cons. DD/MM/YYYY)` per disambiguare prodotti omonimi su date diverse.
  // Body include anche `archivedProductIds` per permettere al client di
  // mostrare errori inline sotto ogni card prodotto.
  const archivedItems = reservation.items.filter((it) => it.product.archivedAt);
  if (archivedItems.length > 0) {
    const labels = archivedItems.map((it) => {
      const delivery = it.product.deliveryDate
        ? ` (cons. ${new Date(it.product.deliveryDate).toLocaleDateString("it-IT")})`
        : "";
      return `${it.product.name}${delivery}`;
    });
    return NextResponse.json(
      {
        error: `${archivedItems.length === 1 ? "Un prodotto è stato archiviato" : `${archivedItems.length} prodotti sono stati archiviati`} dall'amministratore (${labels.join(", ")}). ${archivedItems.length === 1 ? "Rimuovilo" : "Rimuovili"} dal carrello per completare l'ordine.`,
        archivedProductIds: archivedItems.map((it) => it.productId),
      },
      { status: 410 }
    );
  }

  // 2. Transazione: crea ordine, decrementa quantity e reserved, libera reservation, svuota cart.
  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        address: parsed.data.address,
        notes: parsed.data.notes || null,
        paymentMethod: parsed.data.paymentMethod,
        status: OrderStatus.IN_ATTESA,
        stripePaymentId: null,
        items: {
          create: reservation.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
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
