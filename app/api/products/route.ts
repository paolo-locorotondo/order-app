import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { getToken } from "next-auth/jwt";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
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
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      price: parsed.data.price,
      sku: parsed.data.sku,
      image: parsed.data.image,
      inventory: {
        create: {
          quantity: 0,
          reserved: 0,
          reorderPoint: 5,
        },
      },
    },
    include: { inventory: true },
  });

  return NextResponse.json({ data: product }, { status: 201 });
}
