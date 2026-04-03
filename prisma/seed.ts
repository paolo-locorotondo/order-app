import "dotenv/config";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();


async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
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
      where: { slug: productFields.slug },
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
