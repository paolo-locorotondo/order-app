import { PrismaClient } from "../../../app/generated/prisma";

export const prisma = new PrismaClient();

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
