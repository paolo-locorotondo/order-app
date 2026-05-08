import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { cartItemSchema } from "@/lib/validators";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: token.id },
    include: { product: true },
  });

  return NextResponse.json({ data: cartItems });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = cartItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: token.id, productId: parsed.data.productId } },
  });

  const result = existing
    ? await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + parsed.data.quantity },
        include: { product: true },
      })
    : await prisma.cartItem.create({
        data: {
          userId: token.id,
          productId: parsed.data.productId,
          quantity: parsed.data.quantity,
        },
        include: { product: true },
      });

  return NextResponse.json({ data: result }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = z.object({ id: z.string().cuid(), quantity: z.number().int().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const item = await prisma.cartItem.findUnique({ where: { id: parsed.data.id } });
  if (!item || item.userId !== token.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: parsed.data.quantity },
    include: { product: true },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const itemId = url.searchParams.get("id");
  if (!itemId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== token.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.cartItem.delete({ where: { id: item.id } });
  return NextResponse.json({ data: { id: item.id } });
}
