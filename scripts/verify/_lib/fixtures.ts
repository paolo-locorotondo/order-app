import bcryptjs from "bcryptjs";
import { prisma } from "./prisma";

export interface TestUserSpec {
  email: string;
  password: string;
  name?: string;
  role?: "CUSTOMER" | "ADMIN";
}

export async function upsertTestUser(spec: TestUserSpec) {
  const passwordHash = await bcryptjs.hash(spec.password, 10);
  return prisma.user.upsert({
    where: { email: spec.email },
    update: { password: passwordHash, role: spec.role ?? "CUSTOMER" },
    create: {
      email: spec.email,
      name: spec.name ?? "Verify Test",
      password: passwordHash,
      role: spec.role ?? "CUSTOMER",
    },
  });
}

export async function cleanupUserByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await cleanupUser(user.id);
}

export async function cleanupUser(userId: string) {
  await prisma.cartReservation.deleteMany({ where: { userId } });
  await prisma.cartItem.deleteMany({ where: { userId } });
  await prisma.orderItem.deleteMany({ where: { order: { userId } } });
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

export interface TestProductSpec {
  name?: string;
  price?: number;
  stock: number;
}

let productCounter = 0;

export async function createTestProduct(spec: TestProductSpec) {
  productCounter++;
  const stamp = `${Date.now()}-${productCounter}`;
  const product = await prisma.product.create({
    data: {
      name: spec.name ?? `Verify Product ${stamp}`,
      slug: `verify-${stamp}`,
      sku: `VRF-${stamp}`,
      price: spec.price ?? 9.99,
      description: "Verify smoke test product",
      inventory: { create: { quantity: spec.stock, reserved: 0 } },
    },
  });
  return product;
}

export async function cleanupProduct(productId: string) {
  await prisma.cartReservationItem.deleteMany({ where: { productId } });
  await prisma.cartItem.deleteMany({ where: { productId } });
  await prisma.inventory.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
}

export async function setInventory(productId: string, quantity: number, reserved: number = 0) {
  await prisma.inventory.upsert({
    where: { productId },
    update: { quantity, reserved },
    create: { productId, quantity, reserved },
  });
}

export async function getInventory(productId: string) {
  return prisma.inventory.findUnique({ where: { productId } });
}
