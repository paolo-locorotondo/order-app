import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";
import { RESERVATION_WINDOW_MS, releaseReservation } from "@/lib/reservation";

// GET: ritorna la reservation attiva (se presente e non scaduta) senza modificare nulla.
// Usato dal client al mount per riprendere lo stato del timer.
export async function GET(request: NextRequest) {
  const auth = await validateAuth(request, [UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const reservation = await prisma.cartReservation.findUnique({
    where: { userId: auth.token.id },
  });

  if (!reservation) {
    return NextResponse.json({ data: { reservation: null } });
  }

  if (reservation.expiresAt.getTime() <= Date.now()) {
    await releaseReservation(auth.token.id);
    return NextResponse.json({ data: { reservation: null, expired: true } });
  }

  return NextResponse.json({
    data: { reservation: { expiresAt: reservation.expiresAt.toISOString() } },
  });
}

// POST: idempotente. Se esiste reservation valida → la ritorna senza toccare l'inventory.
// Se esiste ma è scaduta → la libera e ne crea una nuova.
// Se non esiste → valida disponibilità e la crea, incrementando reserved.
export async function POST(request: NextRequest) {
  const auth = await validateAuth(request, [UserRole.ADMIN, UserRole.CUSTOMER]);
  if (!auth.ok) {
    return auth.errorResponse;
  }
  const userId = auth.token.id;

  // 1. Se esiste già una reservation valida, ritorna senza fare nulla (idempotenza).
  const existing = await prisma.cartReservation.findUnique({
    where: { userId },
  });

  if (existing && existing.expiresAt.getTime() > Date.now()) {
    return NextResponse.json({
      data: { expiresAt: existing.expiresAt.toISOString(), reused: true },
    });
  }

  // 2. Se esiste ma è scaduta, liberala prima di crearne una nuova.
  if (existing) {
    await releaseReservation(userId);
  }

  // 3. Carica il cart corrente.
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: { include: { inventory: true } } },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Il carrello è vuoto" }, { status: 400 });
  }

  // 4. Valida disponibilità prima di creare la reservation.
  for (const item of cartItems) {
    const inventory = item.product.inventory;
    if (!inventory) {
      return NextResponse.json(
        { error: `Inventario non trovato per ${item.product.name}` },
        { status: 404 }
      );
    }

    const availableQuantity = inventory.quantity - inventory.reserved;
    if (availableQuantity < item.quantity) {
      return NextResponse.json(
        {
          error: `Quantità non disponibile: ${item.product.name} ha solo ${availableQuantity} unità libere (richieste: ${item.quantity})`,
        },
        { status: 400 }
      );
    }
  }

  // 5. Transazione: crea reservation + incrementa reserved per ogni item.
  // Il vincolo @unique su userId protegge da race condition (Strict Mode double-fire).
  const expiresAt = new Date(Date.now() + RESERVATION_WINDOW_MS);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.cartReservation.create({
        data: {
          userId,
          expiresAt,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
      });

      for (const item of cartItems) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { reserved: { increment: item.quantity } },
        });
      }
    });
  } catch (err) {
    // Race condition: una richiesta concorrente ha creato la reservation per primo.
    // Recuperiamo quella esistente.
    const concurrent = await prisma.cartReservation.findUnique({ where: { userId } });
    if (concurrent && concurrent.expiresAt.getTime() > Date.now()) {
      return NextResponse.json({
        data: { expiresAt: concurrent.expiresAt.toISOString(), reused: true },
      });
    }
    throw err;
  }

  return NextResponse.json({ data: { expiresAt: expiresAt.toISOString(), reused: false } });
}
