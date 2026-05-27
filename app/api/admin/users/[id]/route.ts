import bcryptjs from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { userUpdateSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const { id: userId } = await params;

  try {
    const body = await request.json();

    // Validate input with Zod
    const validationResult = userUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(err => err.message);
      return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
    }

    const { name, email, password, role, phoneNumber } = validationResult.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
    }

    const updateData: { name?: string; email?: string; password?: string; role?: UserRole; phoneNumber?: string | null } = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail && existingEmail.id !== userId) {
        return NextResponse.json(
          { error: "Esiste già un utente con questa email." },
          { status: 409 }
        );
      }
      updateData.email = email;
    }
    if (password !== undefined) {
      updateData.password = await bcryptjs.hash(password, 10);
    }
    if (role !== undefined) {
      // Mirror del check su DELETE: un admin non può degradarsi a NUOVO da solo,
      // altrimenti perderebbe accesso e l'unico modo per riassegnarlo sarebbe da DB.
      if (auth.token.id === userId && role === UserRole.NUOVO) {
        return NextResponse.json(
          { error: "Non puoi assegnare il ruolo NUOVO al tuo account." },
          { status: 400 }
        );
      }
      updateData.role = role;
    }
    // phoneNumber: applichiamo solo se la chiave è nel body originale
    // (validationResult.data.phoneNumber è sempre presente dopo il transform —
    // null se omesso o vuoto. Distinguiamo "non aggiornare" da "azzera" guardando
    // direttamente il body raw).
    if (Object.prototype.hasOwnProperty.call(body, "phoneNumber")) {
      updateData.phoneNumber = phoneNumber;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const { id: userId } = await params;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
    }

    // Cannot delete admin user who is the current one
    if (auth.token.id === userId) {
      return NextResponse.json(
        { error: "Non puoi eliminare il tuo account." },
        { status: 400 }
      );
    }

    // Atomic: cleanup cart + orderItems + orders + user.
    // Se uno step fallisce, niente viene applicato (no orfani in nessuna tabella).
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { userId } }),
      prisma.cartReservationItem.deleteMany({ where: { reservation: { userId } } }),
      prisma.cartReservation.deleteMany({ where: { userId } }),
      prisma.orderItem.deleteMany({ where: { order: { userId } } }),
      prisma.order.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ message: "Utente eliminato con successo." });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
