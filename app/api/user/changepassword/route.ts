import bcryptjs from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const auth = await validateAuth(request, [UserRole.NUOVO, UserRole.CUSTOMER, UserRole.ADMIN]);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  if (!auth.user.password) {
    // Utente OAuth (es. Google): la password è gestita dal provider esterno.
    return NextResponse.json(
      { error: "Il tuo account usa il login Google. Gestisci la password dall'account Google." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const validationResult = changePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((err) => err.message);
      return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
    }

    const { currentPassword, newPassword } = validationResult.data;

    const isCurrentValid = await bcryptjs.compare(currentPassword, auth.user.password);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Password attuale non corretta." }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "La nuova password deve essere diversa dall'attuale." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Password aggiornata con successo." });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
