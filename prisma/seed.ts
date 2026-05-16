import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma";
import bcryptjs from "bcryptjs";
import { UserRole } from "@/app/generated/prisma/enums";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

async function main() {
  // Create admin user with secure credentials
  const adminPassword = await hashPassword("AdminSecure123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // Create test customer user with secure credentials
  const testPassword = await hashPassword("TestSecure456!");
  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      password: testPassword,
      role: UserRole.CUSTOMER,
    },
  });

  // Create sample products
  const products = [
    {
      name: "Laptop Gaming",
      slug: "laptop-gaming",
      description: "Laptop ad alte prestazioni per gaming",
      price: 1299.99,
      sku: "LAPTOP-001",
      inventory: { quantity: 10, reorderPoint: 2 },
    },
    {
      name: "Mouse Wireless",
      slug: "mouse-wireless",
      description: "Mouse ergonomico senza fili",
      price: 49.99,
      sku: "MOUSE-001",
      inventory: { quantity: 50, reorderPoint: 10 },
    },
    {
      name: "Tastiera Meccanica",
      slug: "tastiera-meccanica",
      description: "Tastiera meccanica RGB",
      price: 89.99,
      sku: "KEYBOARD-001",
      inventory: { quantity: 25, reorderPoint: 5 },
    },
  ];

  for (const productData of products) {
    const { inventory, ...productFields } = productData;
    await prisma.product.upsert({
      where: { 
        slug_sku: {
          slug: productFields.slug,
          sku: productFields.sku,
        }
      },
      update: {},
      create: {
        ...productFields,
        inventory: {
          create: inventory,
        },
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
