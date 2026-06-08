import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bulkOrderStatusSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";
import { OrderStatus } from "@/app/generated/prisma/enums";

/**
 * POST /api/admin/orders/bulk/status
 * Body: { ids: string[], status: OrderStatus }
 *
 * Cambia lo status di più ordini in un'unica transazione, gestendo le
 * transizioni che toccano l'inventory (mirror di MIGLIORAMENTO #2):
 *   - cancel transition (NON-ANNULLATO → ANNULLATO): increment inventory
 *   - uncancel transition (ANNULLATO → NON-ANNULLATO): decrement inventory
 *     dopo verifica disponibilità
 *
 * Strategia all-or-nothing: se la verifica disponibilità per UN solo ordine
 * non passa (uncancel con stock insufficiente), l'intera operazione viene
 * rifiutata con errore dettagliato. Niente partial-apply.
 */
export async function POST(request: NextRequest) {
    const auth = await validateAuth(request, UserRole.ADMIN);
    if (!auth.ok) {
        return auth.errorResponse;
    }

    try {
        const body = await request.json();
        const validationResult = bulkOrderStatusSchema.safeParse(body);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.issues.map((err) => err.message);
            return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
        }

        const { ids, status: targetStatus } = validationResult.data;
        const uniqueIds = Array.from(new Set(ids));

        const orders = await prisma.order.findMany({
            where: { id: { in: uniqueIds } },
            include: { items: true },
        });

        if (orders.length === 0) {
            return NextResponse.json({ error: "Nessun ordine trovato per gli id passati." }, { status: 404 });
        }

        // Categorizza ogni ordine in base alla transizione richiesta.
        type CategorizedOrder = (typeof orders)[number];
        const cancelTransitions: CategorizedOrder[] = [];   // NON-ANNULLATO → ANNULLATO (restore stock)
        const uncancelTransitions: CategorizedOrder[] = []; // ANNULLATO → NON-ANNULLATO (re-decrement stock)
        // I no-op (status già uguale a target) e gli scalar puri non toccano inventory.

        for (const order of orders) {
            const wasAnnullato = order.status === OrderStatus.ANNULLATO;
            const willBeAnnullato = targetStatus === OrderStatus.ANNULLATO;
            if (order.status === targetStatus) continue; // no-op
            if (!wasAnnullato && willBeAnnullato) cancelTransitions.push(order);
            else if (wasAnnullato && !willBeAnnullato) uncancelTransitions.push(order);
            // else: NON-ANNULLATO → NON-ANNULLATO (es. IN_ATTESA → CONFERMATO): scalar only, no inventory.
        }

        // Pre-flight all-or-nothing per gli uncancel: aggrega le quantità richieste
        // per productId su TUTTI gli ordini in uncancel, poi confronta con la
        // disponibilità reale (quantity - reserved).
        if (uncancelTransitions.length > 0) {
            const requiredByProduct = new Map<string, number>();
            for (const order of uncancelTransitions) {
                for (const item of order.items) {
                    requiredByProduct.set(
                        item.productId,
                        (requiredByProduct.get(item.productId) ?? 0) + item.quantity,
                    );
                }
            }
            const productIds = Array.from(requiredByProduct.keys());
            const inventories = await prisma.inventory.findMany({ where: { productId: { in: productIds } } });
            const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

            const failures: string[] = [];
            for (const [productId, totalRequired] of requiredByProduct) {
                const inv = inventories.find((i) => i.productId === productId);
                const product = products.find((p) => p.id === productId);
                const invQuantity = inv?.quantity ?? 0;
                const invReserved = inv?.reserved ?? 0;
                const available = invQuantity - invReserved;
                if (available < totalRequired) {
                    failures.push(
                        `${product?.name ?? productId}: disponibili ${available} (di ${invQuantity} totali, ${invReserved} riservati), richiesti ${totalRequired}`,
                    );
                }
            }

            if (failures.length > 0) {
                return NextResponse.json(
                    {
                        error: `Disponibilità insufficiente per riattivare ${uncancelTransitions.length} ${uncancelTransitions.length === 1 ? "ordine" : "ordini"}: ${failures.join("; ")}`,
                    },
                    { status: 400 },
                );
            }
        }

        // Apply atomico.
        const result = await prisma.$transaction(async (tx) => {
            // Cancel transitions: increment inventory.
            for (const order of cancelTransitions) {
                const qtyByProduct = new Map<string, number>();
                for (const item of order.items) {
                    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
                }
                for (const [productId, qty] of qtyByProduct) {
                    await tx.inventory.update({
                        where: { productId },
                        data: { quantity: { increment: qty } },
                    });
                }
            }

            // Uncancel transitions: decrement inventory.
            for (const order of uncancelTransitions) {
                const qtyByProduct = new Map<string, number>();
                for (const item of order.items) {
                    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
                }
                for (const [productId, qty] of qtyByProduct) {
                    await tx.inventory.update({
                        where: { productId },
                        data: { quantity: { decrement: qty } },
                    });
                }
            }

            // Status update per tutti gli id (anche i no-op: prisma updateMany è
            // efficiente, l'updatedAt si bumpa anche se status è uguale ma è un
            // dettaglio accettabile).
            const updateResult = await tx.order.updateMany({
                where: { id: { in: uniqueIds } },
                data: { status: targetStatus },
            });
            return updateResult;
        });

        return NextResponse.json({
            updated: result.count,
            status: targetStatus,
            inventoryRestored: cancelTransitions.length,
            inventoryReDecremented: uncancelTransitions.length,
        });
    } catch (error) {
        console.error("Admin bulk update orders status error:", error);
        return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
    }
}
