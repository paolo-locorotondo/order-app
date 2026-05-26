import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";
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
        price: z.number().min(0, "Prezzo non può essere negativo"),
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
      const available = inv?.quantity ?? 0;
      if (available < delta) {
        return NextResponse.json(
          {
            error: `Superata disponibilità del prodotto ${product.name}. Disponibili: ${available}, richiesti in più: ${delta}`,
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

  // Solo campi scalari.
  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.address && { address: parsed.data.address }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes || null }),
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

  try {
    // Atomic: restore inventory + delete items + delete order.
    // Se uno step fallisce, niente viene applicato (no stock fantasma né ordini orfani).
    await prisma.$transaction([
      ...order.items.map((item) =>
        prisma.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { increment: item.quantity } },
        }),
      ),
      prisma.orderItem.deleteMany({ where: { orderId: params.id } }),
      prisma.order.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
