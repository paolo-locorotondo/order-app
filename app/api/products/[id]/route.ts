import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const params = await context.params;
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { inventory: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: product });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {

  const auth = await validateAuth(request, UserRole.ADMIN);  
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const params = await context.params;

  const body = await request.json();
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Generate SKU if not provided (combine slug with timestamp)
  // SKU is now required in the schema, so we must always provide a value
  const sku = parsed.data.sku?.trim() || `${parsed.data.slug}-${Date.now()}`.toUpperCase();

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      price: parsed.data.price,
      sku,
      image: parsed.data.image,
    },
    include: { inventory: true },
  });

  revalidatePath("/shop");
  revalidatePath(`/shop/products/${params.id}`);
  return NextResponse.json({ data: updated });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }
 
  const params = await context.params;

  try {
    // Block-if-orders: preserva lo storico ordini.
    const orderItemCount = await prisma.orderItem.count({ where: { productId: params.id } });
    if (orderItemCount > 0) {
      return NextResponse.json(
        { error: "Impossibile eliminare: prodotto presente in ordini storici. Considera di disattivarlo invece." },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { productId: params.id } }),
      prisma.cartReservationItem.deleteMany({ where: { productId: params.id } }),
      prisma.inventory.deleteMany({ where: { productId: params.id } }),
      prisma.product.delete({ where: { id: params.id } }),
    ]);

    revalidatePath("/shop");
    return NextResponse.json({ data: { id: params.id } });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
