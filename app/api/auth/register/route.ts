import bcryptjs from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { userRegistrationSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validationResult = userRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(err => err.message);
      return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
    }

    const { name, email, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Esiste già un account con questa email." }, { status: 409 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "CUSTOMER",
      },
    });

    return NextResponse.json({ message: "Registrazione completata." }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
