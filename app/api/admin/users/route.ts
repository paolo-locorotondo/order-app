import bcryptjs from "bcryptjs";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { userRegistrationSchema } from "@/lib/validators";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  if (!AUTH_SECRET) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const token = await getToken({ req: request, secret: AUTH_SECRET });
  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  if (!AUTH_SECRET) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const token = await getToken({ req: request, secret: AUTH_SECRET });
  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate input with Zod
    const validationResult = userRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(err => err.message);
      return NextResponse.json({ error: errorMessages.join(", ") }, { status: 400 });
    }

    const { name, email, password } = validationResult.data;
    const role = body.role === "ADMIN" ? "ADMIN" : "CUSTOMER";

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Esiste già un utente con questa email." }, { status: 409 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
