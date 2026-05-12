import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { validateAuth, UserRole } from "@/lib/auth-helpers";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const skip = (page - 1) * PAGE_SIZE;

  const products = await prisma.product.findMany({
    skip,
    take: PAGE_SIZE,
    include: { inventory: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: products });
}

export async function POST(request: NextRequest) {

  const auth = await validateAuth(request, UserRole.ADMIN);
  if (!auth.ok) {
    return auth.errorResponse;
  }

  const body = await request.json();
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const quantity = Math.max(0, Number(body.quantity) || 0);
  const sku = parsed.data.sku?.trim() || `${parsed.data.slug}-${Date.now()}`.toUpperCase();

  const existing = await prisma.product.findUnique({
    where: {
      slug_sku: {
        slug: parsed.data.slug,
        sku,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: `Prodotto con slug "${parsed.data.slug}" e SKU "${sku}" esiste già.` },
      { status: 400 }
    );
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        price: parsed.data.price,
        sku,
        image: parsed.data.image,
        inventory: {
          create: {
            quantity,
            reserved: 0,
            reorderPoint: 5,
          },
        },
      },
      include: { inventory: true },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { error: "Errore nella creazione del prodotto" },
      { status: 500 }
    );
  }
}
