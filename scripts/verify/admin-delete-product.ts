import "dotenv/config";
import { prisma, disconnectPrisma } from "./_lib/prisma";
import { createHttpClient, checkServerReachable } from "./_lib/http";
import { login } from "./_lib/auth";
import {
  upsertTestUser,
  cleanupUserByEmail,
  createTestProduct,
  cleanupProduct,
  getInventory,
} from "./_lib/fixtures";
import { log, section, assertEq, assertOk, assertStatus } from "./_lib/assert";

const ADMIN_EMAIL = "verify-admin@example.com";
const ADMIN_PASSWORD = "verifyadmin123";
const CUSTOMER_EMAIL = "verify-customer@example.com";
const CUSTOMER_PASSWORD = "verifycustomer123";

async function main() {
  await checkServerReachable();

  section("Setup admin-delete-product");
  const admin = await upsertTestUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "ADMIN", name: "Verify Admin" });
  const customer = await upsertTestUser({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, role: "CUSTOMER", name: "Verify Customer" });

  // Prodotto A: avrà un ordine storico → DELETE deve essere bloccato (409)
  const productWithOrders = await createTestProduct({ stock: 10, price: 30 });
  // Prodotto B: avrà cartItem + cartReservationItem + inventory ma NESSUN orderItem → DELETE atomico OK
  const productClean = await createTestProduct({ stock: 5, price: 20 });

  log("✓", `admin=${admin.id} customer=${customer.id} A=${productWithOrders.id} B=${productClean.id}`);

  // Seed orderItem su productWithOrders
  await prisma.order.create({
    data: {
      userId: customer.id,
      total: 30,
      address: "Via Verify 1, Milano",
      paymentMethod: "CASH",
      status: "PENDING",
      items: { create: [{ productId: productWithOrders.id, quantity: 1, price: 30 }] },
    },
  });

  // Seed cartItem + cartReservation per productClean
  await prisma.cartItem.create({
    data: { userId: customer.id, productId: productClean.id, quantity: 2 },
  });
  await prisma.cartReservation.create({
    data: {
      userId: customer.id,
      expiresAt: new Date(Date.now() + 60 * 60_000),
      items: { create: [{ productId: productClean.id, quantity: 2 }] },
    },
  });

  const client = createHttpClient();
  await login(client, ADMIN_EMAIL, ADMIN_PASSWORD);
  log("✓", "Admin login OK");

  try {
    section("STEP 1: DELETE prodotto con ordini storici → 409 (block-if-orders)");
    const blockRes = await client.http(`/api/products/${productWithOrders.id}`, { method: "DELETE" });
    await assertStatus(blockRes, 409, "DELETE con orderItems → 409");
    const blockJson = (await blockRes.json()) as { error: string };
    log("✅", `409 atteso confermato`, blockJson);

    // Verifica che il prodotto NON sia stato eliminato
    const stillExists = await prisma.product.findUnique({ where: { id: productWithOrders.id } });
    if (!stillExists) throw new Error("Prodotto eliminato nonostante 409");
    log("✓", "Prodotto con ordini ancora presente (corretto)");

    section("STEP 2: DELETE prodotto pulito (cleanup atomico cartItem/reservationItem/inventory/product)");
    // Stato pre-delete
    const preCart = await prisma.cartItem.count({ where: { productId: productClean.id } });
    const preResItems = await prisma.cartReservationItem.count({ where: { productId: productClean.id } });
    const preInv = await getInventory(productClean.id);
    log("ℹ", "pre-delete state", { cart: preCart, reservationItems: preResItems, inventory: preInv?.quantity });
    assertEq(preCart, 1, "pre cart=1");
    assertEq(preResItems, 1, "pre reservationItems=1");
    assertEq(preInv?.quantity, 5, "pre inventory=5");

    const delRes = await client.http(`/api/products/${productClean.id}`, { method: "DELETE" });
    await assertOk(delRes, "DELETE /api/products/{id}");
    log("✅", `delete status=${delRes.status}`);

    const productAfter = await prisma.product.findUnique({ where: { id: productClean.id } });
    assertEq(productAfter, null, "product eliminato");

    const cartAfter = await prisma.cartItem.count({ where: { productId: productClean.id } });
    assertEq(cartAfter, 0, "cartItems eliminati");

    const resItemsAfter = await prisma.cartReservationItem.count({ where: { productId: productClean.id } });
    assertEq(resItemsAfter, 0, "cartReservationItem eliminati");

    const invAfter = await getInventory(productClean.id);
    assertEq(invAfter, null, "inventory eliminato");

    section("STEP 3: DELETE su id inesistente → 500 (route attuale: P2025 cattura come 500)");
    const noneRes = await client.http(`/api/products/non-existent-product-xyz`, { method: "DELETE" });
    if (noneRes.ok) throw new Error("Atteso fallimento per id inesistente");
    log("✅", `non-2xx atteso confermato status=${noneRes.status}`);

    console.log("\n=== admin-delete-product: TUTTO OK ===");
  } finally {
    section("Cleanup");
    // Rimuovi orderItem prima di poter eliminare il prodotto A
    await prisma.orderItem.deleteMany({ where: { productId: productWithOrders.id } });
    await prisma.order.deleteMany({ where: { userId: customer.id } });
    await cleanupUserByEmail(ADMIN_EMAIL);
    await cleanupUserByEmail(CUSTOMER_EMAIL);
    await cleanupProduct(productWithOrders.id);
    await cleanupProduct(productClean.id).catch(() => {});
    log("✓", "cleanup done");
  }
}

main()
  .then(() => disconnectPrisma())
  .catch(async (e) => {
    console.error("❌ FAIL:", e?.message ?? e);
    if (e?.stack) console.error(e.stack);
    await disconnectPrisma();
    process.exit(1);
  });
