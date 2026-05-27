import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { bulkProductDeleteSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

/**
 * DELETE /api/admin/products/bulk
 * Body: { ids: string[] }
 *
 * Bulk delete con guard block-if-orders (mirror del DELETE single in
 * /api/products/[id]): se almeno UN prodotto della selezione è referenziato
 * da OrderItem storici, l'intera operazione viene rifiutata con 409 e
 * messaggio che elenca i prodotti bloccanti. Atomico: niente partial-apply.
 *
 * Se la pre-flight passa, in transazione: cleanup di CartItem +
 * CartReservationItem + Inventory + Product per tutti gli id.
 */
export async function DELETE(request: NextRequest) {
    const auth = await validateAuth(request, UserRole.ADMIN);
    if (!auth.ok) {
        return auth.errorResponse;
    }

    try {
        const body = await request.json();
        const validationResult = bulkProductDeleteSchema.safeParse(body);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.issues.map((err) => err.message);
            return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
        }

        const { ids } = validationResult.data;
        const uniqueIds = Array.from(new Set(ids));

        // Pre-flight all-or-nothing: raggruppa per productId i conteggi degli
        // OrderItem in essere. Se qualunque prodotto della selezione ha count > 0
        // rifiuta l'intera operazione.
        const blockedItems = await prisma.orderItem.groupBy({
            by: ["productId"],
            where: { productId: { in: uniqueIds } },
            _count: { _all: true },
        });

        if (blockedItems.length > 0) {
            const blockedIds = blockedItems.map((b) => b.productId);
            const blockedProducts = await prisma.product.findMany({
                where: { id: { in: blockedIds } },
                select: { id: true, name: true },
            });
            const names = blockedProducts.map((p) => p.name).join(", ");
            return NextResponse.json(
                {
                    error: `Impossibile eliminare: ${blockedItems.length} ${blockedItems.length === 1 ? "prodotto è presente" : "prodotti sono presenti"} in ordini storici (${names}). Considera di disattivarli invece.`,
                },
                { status: 409 },
            );
        }

        await prisma.$transaction([
            prisma.cartItem.deleteMany({ where: { productId: { in: uniqueIds } } }),
            prisma.cartReservationItem.deleteMany({ where: { productId: { in: uniqueIds } } }),
            prisma.inventory.deleteMany({ where: { productId: { in: uniqueIds } } }),
            prisma.product.deleteMany({ where: { id: { in: uniqueIds } } }),
        ]);

        revalidatePath("/shop");
        return NextResponse.json({ deleted: uniqueIds.length });
    } catch (error) {
        console.error("Admin bulk delete products error:", error);
        return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
    }
}
