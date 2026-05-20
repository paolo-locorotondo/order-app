import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.inventory.updateMany({ data: { reserved: 0 } });
  const cr = await prisma.cartReservation.deleteMany({});
  console.log(`Inventory.reserved azzerati: ${inv.count}`);
  console.log(`CartReservation eliminate: ${cr.count}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
