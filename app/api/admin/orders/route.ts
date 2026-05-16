import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

const orderSchema = z.object({
  address: z.string().min(10, "Indirizzo deve essere almeno 10 caratteri"),
  paymentMethod: z.enum(["stripe", "paypal", "cash"]).default("cash"),
});

const adminOrderSchema = z.object({
  userId: z.string().min(1, "User ID è obbligatorio"),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().min(1, "Quantità deve essere almeno 1"),
    })
  ).min(1, "Almeno un articolo è richiesto"),
  address: z.string().min(10, "Indirizzo deve essere almeno 10 caratteri"),
  paymentMethod: z.enum(["stripe", "paypal", "cash"]).default("cash"),
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

  // Valida inventario
  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.productId) } },
    include: { inventory: true },
  });

  for (const item of parsed.data.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
    }
    const availableQty = product.inventory?.quantity ?? 0;
    if (availableQty < item.quantity) {
      return NextResponse.json(
        {
          error: `Quantità non disponibile: ${product.name} ha solo ${availableQty} unità disponibili (richieste: ${item.quantity})`,
        },
        { status: 400 }
      );
    }
  }

  const total = parsed.data.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (item.quantity * (product?.price ?? 0));
  }, 0);

  const created = await prisma.order.create({
    data: {
      userId: parsed.data.userId,
      total,
      address: parsed.data.address,
      paymentMethod: parsed.data.paymentMethod,
      status: "PENDING", // TODO usare enum prisma
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

  // Update inventory
  await Promise.all(
    parsed.data.items.map((item) =>
      prisma.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      }),
    ),
  );

  return NextResponse.json({ data: created }, { status: 201 });

}
