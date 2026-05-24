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
 * Libera una singola reservation scaduta in modo race-safe.
 *
 * Usa `deleteMany` con check su `expiresAt` come lock implicito: il DB
 * garantisce che solo una transazione concorrente otterrà count=1.
 * Decrementa l'inventory SOLO se la delete è andata a buon fine.
 *
 * Gestisce il caso in cui l'utente proprietario abbia ricreato una
 * nuova reservation nel frattempo: l'id è diverso, quindi questa
 * funzione opera solo sul record originale e non tocca il nuovo.
 */
async function releaseExpiredReservation(reservationId: string): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.cartReservation.findFirst({
      where: { id: reservationId, expiresAt: { lte: new Date() } },
      include: { items: true },
    });
    if (!reservation) return false;

    const result = await tx.cartReservation.deleteMany({
      where: { id: reservationId, expiresAt: { lte: new Date() } },
    });
    if (result.count === 0) return false;

    for (const item of reservation.items) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { reserved: { decrement: item.quantity } },
      });
    }
    return true;
  });
}

/**
 * Libera tutte le reservation scadute (cleanup on read).
 * Chiamata opportunisticamente prima di creare una nuova reservation per
 * evitare che lo stock di utenti che hanno abbandonato la sessione resti
 * bloccato come "reserved" e penalizzi gli altri utenti.
 *
 * Race-safe: opera per `id` e ricontrolla `expiresAt` al momento della
 * delete, quindi non interferisce con reservation appena ricreate.
 *
 * Ritorna il numero di reservation effettivamente rilasciate.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const expired = await prisma.cartReservation.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true },
  });

  let released = 0;
  for (const { id } of expired) {
    const ok = await releaseExpiredReservation(id);
    if (ok) released++;
  }
  return released;
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
