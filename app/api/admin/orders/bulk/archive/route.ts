import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bulkArchiveSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

/**
 * POST /api/admin/orders/bulk/archive
 * Body: { ids: string[], archive: boolean }
 *
 * Soft-archive di più ordini in transazione:
 *   - archive: true  → archivedAt = now
 *   - archive: false → archivedAt = null (unarchive)
 *
 * Niente impatto su status né inventory: l'archivio è puramente UX (nascondere
 * dalle view di default). Un ordine ANNULLATO archiviato resta annullato.
 */
export async function POST(request: NextRequest) {
    const auth = await validateAuth(request, UserRole.ADMIN);
    if (!auth.ok) {
        return auth.errorResponse;
    }

    try {
        const body = await request.json();
        const validationResult = bulkArchiveSchema.safeParse(body);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.issues.map((err) => err.message);
            return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
        }

        const { ids, archive } = validationResult.data;
        const uniqueIds = Array.from(new Set(ids));

        const result = await prisma.order.updateMany({
            where: { id: { in: uniqueIds } },
            data: { archivedAt: archive ? new Date() : null },
        });

        return NextResponse.json({ updated: result.count, archived: archive });
    } catch (error) {
        console.error("Admin bulk archive orders error:", error);
        return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
    }
}
