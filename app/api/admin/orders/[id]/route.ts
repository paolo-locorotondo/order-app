import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";
import { priceSchema } from "@/lib/validators";
import { PaymentMethods, OrderStatus } from "@/app/generated/prisma/enums";

const updateOrderSchema = z.object({
  status: z.enum([
    OrderStatus.IN_ATTESA,
    OrderStatus.CONFERMATO,
    OrderStatus.SPEDITO,
    OrderStatus.PAGATO_DA_CONSEGNARE,
    OrderStatus.CONSEGNATO_DA_PAGARE,
    OrderStatus.CONSEGNATO_E_PAGATO,
    OrderStatus.ANNULLATO,
  ]).optional(),
  userId: z.string().min(1).optional(),
  address: z
    .string()
    .refine((v) => v.length === 0 || v.length >= 10, "Indirizzo deve essere almeno 10 caratteri")
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
  paymentMethod: z.enum([PaymentMethods.STRIPE, PaymentMethods.PAYPAL, PaymentMethods.CASH]).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        productName: z.string().min(1, "Nome prodotto obbligatorio"),
        quantity: z.number().int().min(1, "Quantità deve essere almeno 1"),
        price: priceSchema,
      })
    )
    .min(1, "Almeno un articolo è richiesto")
    .optional(),
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

  const existing = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const newItems = parsed.data.items;
  const newStatus = parsed.data.status;
  const wasAnnullato = existing.status === OrderStatus.ANNULLATO;
  const willBeAnnullato = newStatus === OrderStatus.ANNULLATO;
  const isCancelTransition = !wasAnnullato && willBeAnnullato;
  const isUncancelTransition = wasAnnullato && newStatus !== undefined && !willBeAnnullato;

  // Cambio cliente (userId): consentito solo se l'ordine è in IN_ATTESA. Per ordini già
  // promossi a stati successivi (CONFERMATO/SPEDITO/...) cambiare il cliente sarebbe
  // falsificare l'audit trail.
  const isUserIdChange = parsed.data.userId !== undefined && parsed.data.userId !== existing.userId;
  if (isUserIdChange) {
    if (existing.status !== OrderStatus.IN_ATTESA) {
      return NextResponse.json(
        { error: `Il cliente di un ordine può essere cambiato solo se lo stato è "${OrderStatus.IN_ATTESA}". Stato attuale: "${existing.status}".` },
        { status: 400 }
      );
    }
    const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.userId! } });
    if (!targetUser) {
      return NextResponse.json({ error: "Nuovo cliente non trovato" }, { status: 404 });
    }
  }

  // Edge case: combinazioni proibite. L'admin deve fare due chiamate separate per
  // mantenere la logica di inventory pulita e prevedibile.
  if (newItems && wasAnnullato) {
    return NextResponse.json(
      { error: "Impossibile modificare gli articoli di un ordine annullato. Riattivalo prima cambiando lo status." },
      { status: 400 }
    );
  }
  if (newItems && isCancelTransition) {
    return NextResponse.json(
      { error: "Impossibile modificare gli articoli e annullare l'ordine nella stessa operazione. Prima salva gli articoli, poi annulla." },
      { status: 400 }
    );
  }

  // Se arrivano items: serve transazione con delta inventory + replace OrderItem rows.
  if (newItems) {
    // Aggrega per productId (riga ripetuta sullo stesso prodotto = somma).
    const newQtyByProduct = new Map<string, number>();
    for (const it of newItems) {
      newQtyByProduct.set(it.productId, (newQtyByProduct.get(it.productId) ?? 0) + it.quantity);
    }
    const oldQtyByProduct = new Map<string, number>();
    for (const it of existing.items) {
      oldQtyByProduct.set(it.productId, (oldQtyByProduct.get(it.productId) ?? 0) + it.quantity);
    }

    // Delta per ogni prodotto coinvolto (vecchi + nuovi).
    const allProductIds = new Set<string>([...newQtyByProduct.keys(), ...oldQtyByProduct.keys()]);

    // Verifica disponibilità prima della transazione: per i prodotti con delta > 0,
    // serve abbastanza stock libero (l'inventory NON contiene la quota già riservata da questo ordine,
    // quindi available + oldQty è il vero massimo per la nuova quantità).
    const inventories = await prisma.inventory.findMany({
      where: { productId: { in: Array.from(allProductIds) } },
    });
    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(allProductIds) } },
    });

    for (const productId of allProductIds) {
      const newQty = newQtyByProduct.get(productId) ?? 0;
      const oldQty = oldQtyByProduct.get(productId) ?? 0;
      const delta = newQty - oldQty;
      if (delta <= 0) continue;
      const inv = inventories.find((i) => i.productId === productId);
      const product = products.find((p) => p.id === productId);
      if (!product) {
        return NextResponse.json({ error: `Prodotto ${productId} non trovato` }, { status: 404 });
      }
      // Disponibilità reale = quantity - reserved. L'admin NON può consumare lo stock
      // riservato dai cart checkout di altri customer.
      const invQuantity = inv?.quantity ?? 0;
      const invReserved = inv?.reserved ?? 0;
      const available = invQuantity - invReserved;
      if (available < delta) {
        return NextResponse.json(
          {
            error: `Superata disponibilità del prodotto ${product.name}. Disponibili: ${available} (di ${invQuantity} totali, ${invReserved} riservati), richiesti in più: ${delta}`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Applica i delta sull'inventory.
      for (const productId of allProductIds) {
        const newQty = newQtyByProduct.get(productId) ?? 0;
        const oldQty = oldQtyByProduct.get(productId) ?? 0;
        const delta = newQty - oldQty;
        if (delta === 0) continue;
        await tx.inventory.update({
          where: { productId },
          data: { quantity: { decrement: delta } }, // delta < 0 → decrement negativo = increment
        });
      }

      // Sostituisci le OrderItem rows.
      await tx.orderItem.deleteMany({ where: { orderId: params.id } });

      return tx.order.update({
        where: { id: params.id },
        data: {
          // Forza il bump di updatedAt: con sole nested writes Prisma non emette UPDATE sul parent.
          updatedAt: new Date(),
          ...(parsed.data.status && { status: parsed.data.status }),
          ...(isUserIdChange && { userId: parsed.data.userId }),
          ...(parsed.data.address && { address: parsed.data.address }),
          ...(parsed.data.notes !== undefined && { notes: parsed.data.notes || null }),
          ...(parsed.data.paymentMethod && { paymentMethod: parsed.data.paymentMethod }),
          items: {
            create: newItems.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              quantity: it.quantity,
              price: it.price,
            })),
          },
        },
        include: { items: { include: { product: true } }, user: true },
      });
    });

    return NextResponse.json({ data: updated });
  }

  // Solo campi scalari. Se la transizione coinvolge ANNULLATO, anche l'inventory cambia.
  const scalarData = {
    ...(parsed.data.status && { status: parsed.data.status }),
    ...(isUserIdChange && { userId: parsed.data.userId }),
    ...(parsed.data.address && { address: parsed.data.address }),
    ...(parsed.data.notes !== undefined && { notes: parsed.data.notes || null }),
    ...(parsed.data.paymentMethod && { paymentMethod: parsed.data.paymentMethod }),
  };

  // Aggrega le quantità dell'ordine esistente per productId (riga ripetuta = somma).
  const orderQtyByProduct = new Map<string, number>();
  for (const it of existing.items) {
    orderQtyByProduct.set(it.productId, (orderQtyByProduct.get(it.productId) ?? 0) + it.quantity);
  }

  if (isCancelTransition) {
    // Annullamento: ripristina inventory (increment quantity) + applica scalar in transazione.
    const updated = await prisma.$transaction(async (tx) => {
      for (const [productId, totalQty] of orderQtyByProduct) {
        await tx.inventory.update({
          where: { productId },
          data: { quantity: { increment: totalQty } },
        });
      }
      return tx.order.update({
        where: { id: params.id },
        data: scalarData,
        include: { items: { include: { product: true } }, user: true },
      });
    });
    return NextResponse.json({ data: updated });
  }

  if (isUncancelTransition) {
    // Riattivazione: ridecrementa inventory dopo aver verificato la disponibilità.
    const productIds = Array.from(orderQtyByProduct.keys());
    const inventories = await prisma.inventory.findMany({ where: { productId: { in: productIds } } });
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    for (const [productId, totalQty] of orderQtyByProduct) {
      const inv = inventories.find((i) => i.productId === productId);
      const product = products.find((p) => p.id === productId);
      const invQuantity = inv?.quantity ?? 0;
      const invReserved = inv?.reserved ?? 0;
      const available = invQuantity - invReserved;
      if (available < totalQty) {
        return NextResponse.json(
          {
            error: `Impossibile riattivare l'ordine: disponibilità insufficiente per ${product?.name ?? productId}. Disponibili: ${available} (di ${invQuantity} totali, ${invReserved} riservati), richiesti: ${totalQty}`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const [productId, totalQty] of orderQtyByProduct) {
        await tx.inventory.update({
          where: { productId },
          data: { quantity: { decrement: totalQty } },
        });
      }
      return tx.order.update({
        where: { id: params.id },
        data: scalarData,
        include: { items: { include: { product: true } }, user: true },
      });
    });
    return NextResponse.json({ data: updated });
  }

  // Nessuna transizione che tocchi l'inventory: update scalare semplice.
  const updated = await prisma.order.update({
    where: { id: params.id },
    data: scalarData,
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

  try {
    // DELETE meccanico: solo cleanup di OrderItem + Order. NIENTE restore
    // inventory: l'inventory è guidato esclusivamente dalle transizioni di
    // status (NON-ANNULLATO ↔ ANNULLATO, vedi PUT). Se restituissimo qui lo
    // stock causeremmo un double-restore sugli ordini già ANNULLATO (lo stock
    // era stato ripristinato al momento della transizione). Conseguenza
    // accettata: DELETE su ordine non-ANNULLATO lascia lo stock "occupato"
    // (leak fantasma); l'admin deve annullare prima per liberarlo. La UI mostra
    // un avviso esplicito in caso di status != ANNULLATO.
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: params.id } }),
      prisma.order.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
