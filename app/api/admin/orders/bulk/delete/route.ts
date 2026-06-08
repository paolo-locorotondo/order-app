import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bulkOrderDeleteSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

/**
 * POST /api/admin/orders/bulk/delete
 * Body: { ids: string[] }
 *
 * Cleanup meccanico atomico (no inventory restore — coerente con DELETE single
 * e con la policy "inventory accounting solo via transizioni status",
 * vedi commit b49ef44). Conseguenza accettata: DELETE su ordini non-ANNULLATO
 * lascia lo stock "occupato"; l'admin deve annullare prima per liberarlo.
 *
 * NB: usa POST (non DELETE) perché DELETE con body non è canonico HTTP/REST.
 */
export async function POST(request: NextRequest) {
    const auth = await validateAuth(request, UserRole.ADMIN);
    if (!auth.ok) {
        return auth.errorResponse;
    }

    try {
        const body = await request.json();
        const validationResult = bulkOrderDeleteSchema.safeParse(body);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.issues.map((err) => err.message);
            return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
        }

        const { ids } = validationResult.data;
        const uniqueIds = Array.from(new Set(ids));

        await prisma.$transaction([
            prisma.orderItem.deleteMany({ where: { orderId: { in: uniqueIds } } }),
            prisma.order.deleteMany({ where: { id: { in: uniqueIds } } }),
        ]);

        return NextResponse.json({ deleted: uniqueIds.length });
    } catch (error) {
        console.error("Admin bulk delete orders error:", error);
        return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
    }
}
