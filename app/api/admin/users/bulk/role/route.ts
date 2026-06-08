import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bulkUserRoleSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

/**
 * POST /api/admin/users/bulk/role
 * Body: { ids: string[], role: UserRole }
 *
 * Cambia il ruolo di più utenti in un'unica transazione (`updateMany`).
 * Mirror della self-demotion guard di PUT /[id]: se l'admin loggato è in `ids`
 * e `role !== ADMIN`, l'intera operazione viene rifiutata (400) senza
 * applicare alcun cambio (atomic). Niente bypass: o passa tutto o nulla.
 */
export async function POST(request: NextRequest) {
    const auth = await validateAuth(request, UserRole.ADMIN);
    if (!auth.ok) {
        return auth.errorResponse;
    }

    try {
        const body = await request.json();

        const validationResult = bulkUserRoleSchema.safeParse(body);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.issues.map((err) => err.message);
            return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
        }

        const { ids, role } = validationResult.data;
        const uniqueIds = Array.from(new Set(ids));

        // Self-demotion guard: rifiuta l'intera operazione se l'admin loggato
        // è incluso e il target non è ADMIN (perderebbe accesso e l'unico
        // modo per riassegnarsi ADMIN sarebbe da DB). Mirror del check su
        // PUT /[id]. Atomico: niente passa parziale.
        if (role !== UserRole.ADMIN && uniqueIds.includes(auth.token.id as string)) {
            return NextResponse.json(
                { error: "Non puoi togliere il ruolo ADMIN al tuo account. Deseleziona te stesso e riprova." },
                { status: 400 }
            );
        }

        const result = await prisma.user.updateMany({
            where: { id: { in: uniqueIds } },
            data: { role },
        });

        return NextResponse.json({ updated: result.count, role });
    } catch (error) {
        console.error("Admin bulk update users error:", error);
        return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
    }
}
