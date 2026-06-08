import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { bulkArchiveSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

/**
 * POST /api/admin/products/bulk/archive
 * Body: { ids: string[], archive: boolean }
 *
 * Soft-archive di più prodotti in transazione:
 *   - archive: true  → archivedAt = now
 *   - archive: false → archivedAt = null (unarchive)
 *
 * Reversibile, niente impatto su OrderItem storici (già usano snapshot).
 * Lo shop e le viste admin di default filtrano `archivedAt: null`.
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

        const result = await prisma.product.updateMany({
            where: { id: { in: uniqueIds } },
            data: { archivedAt: archive ? new Date() : null },
        });

        revalidatePath("/shop");
        return NextResponse.json({ updated: result.count, archived: archive });
    } catch (error) {
        console.error("Admin bulk archive products error:", error);
        return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
    }
}
