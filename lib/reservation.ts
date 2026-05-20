import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma";

export const RESERVATION_WINDOW_MS = 5 * 60 * 1000;

/**
 * Libera la reservation di un utente decrementando `reserved` per ogni item
 * e cancellando il record CartReservation.
 *
 * Usa le quantità salvate nella reservation (non il cart corrente) per garantire
 * coerenza anche se il cart è stato modificato nel frattempo.
 *
 * Ritorna true se una reservation esisteva ed è stata liberata, false altrimenti.
 */
export async function releaseReservation(userId: string): Promise<boolean> {
  const reservation = await prisma.cartReservation.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!reservation) return false;

  await prisma.$transaction(async (tx) => {
    for (const item of reservation.items) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { reserved: { decrement: item.quantity } },
      });
    }
    await tx.cartReservation.delete({ where: { id: reservation.id } });
  });

  return true;
}

/**
 * Variante transazionale di releaseReservation, da usare quando si è già
 * dentro una `prisma.$transaction(async (tx) => ...)`.
 */
export async function releaseReservationTx(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<boolean> {
  const reservation = await tx.cartReservation.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!reservation) return false;

  for (const item of reservation.items) {
    await tx.inventory.update({
      where: { productId: item.productId },
      data: { reserved: { decrement: item.quantity } },
    });
  }
  await tx.cartReservation.delete({ where: { id: reservation.id } });

  return true;
}
