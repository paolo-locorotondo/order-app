import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { quantity } = body;

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { error: "Quantità non valida" },
        { status: 400 }
      );
    }

    const inventory = await prisma.inventory.update({
      where: { id: params.id },
      data: { quantity },
      include: { product: true },
    });

    return NextResponse.json({ data: inventory });
  } catch (error) {
    console.error("Inventory update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
