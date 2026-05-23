import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const params = await context.params;

  try {
    const body = await request.json();
    const { quantity, reserved, reorderPoint } = body;

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { error: "Quantità non valida" },
        { status: 400 }
      );
    }

    const inventory = await prisma.inventory.update({
      where: { id: params.id },
      data: {
        quantity,
        ...(reserved !== undefined && { reserved }),
        ...(reorderPoint !== undefined && { reorderPoint }),
      },
      include: { product: true },
    });

    revalidatePath("/shop");
    revalidatePath(`/shop/products/${inventory.productId}`);
    return NextResponse.json({ data: inventory });
  } catch (error) {
    console.error("Inventory update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
