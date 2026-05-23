import "dotenv/config";
import { prisma, disconnectPrisma } from "./_lib/prisma";
import { createHttpClient, checkServerReachable } from "./_lib/http";
import { login } from "./_lib/auth";
import {
  upsertTestUser,
  cleanupUserByEmail,
  createTestProduct,
  cleanupProduct,
} from "./_lib/fixtures";
import { log, section, assertEq, assertOk } from "./_lib/assert";

const ADMIN_EMAIL = "verify-admin@example.com";
const ADMIN_PASSWORD = "verifyadmin123";
const CUSTOMER_EMAIL = "verify-customer@example.com";
const CUSTOMER_PASSWORD = "verifycustomer123";

async function seedCustomerState(userId: string, productId: string) {
  // cart item
  await prisma.cartItem.create({ data: { userId, productId, quantity: 2 } });

  // reservation con item
  await prisma.cartReservation.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + 60 * 60_000),
      items: { create: [{ productId, quantity: 2 }] },
    },
  });

  // ordine storico con orderItem
  await prisma.order.create({
    data: {
      userId,
      total: 50,
      address: "Via Verify 1, Milano",
      paymentMethod: "CASH",
      status: "PENDING",
      items: { create: [{ productId, quantity: 1, price: 50 }] },
    },
  });
}

async function main() {
  await checkServerReachable();

  section("Setup admin-delete-user");
  const admin = await upsertTestUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "ADMIN", name: "Verify Admin" });
  const customer = await upsertTestUser({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, role: "CUSTOMER", name: "Verify Customer" });
  const product = await createTestProduct({ stock: 10, price: 50 });
  await seedCustomerState(customer.id, product.id);
  log("✓", `admin=${admin.id} customer=${customer.id} product=${product.id}`);

  // Verifica stato pre-delete
  const preCart = await prisma.cartItem.count({ where: { userId: customer.id } });
  const preRes = await prisma.cartReservation.count({ where: { userId: customer.id } });
  const preOrders = await prisma.order.count({ where: { userId: customer.id } });
  const preItems = await prisma.orderItem.count({ where: { order: { userId: customer.id } } });
  log("ℹ", "pre-delete state", { cart: preCart, reservations: preRes, orders: preOrders, orderItems: preItems });
  assertEq(preCart, 1, "pre cart=1");
  assertEq(preRes, 1, "pre reservations=1");
  assertEq(preOrders, 1, "pre orders=1");
  assertEq(preItems, 1, "pre orderItems=1");

  const client = createHttpClient();
  await login(client, ADMIN_EMAIL, ADMIN_PASSWORD);
  log("✓", "Admin login OK");

  try {
    section("STEP 1: DELETE su se stesso → 400");
    const selfRes = await client.http(`/api/admin/users/${admin.id}`, { method: "DELETE" });
    assertEq(selfRes.status, 400, "self-delete bloccato → 400");
    log("✅", "self-delete bloccato");

    section("STEP 2: DELETE id inesistente → 404");
    const noneRes = await client.http(`/api/admin/users/non-existent-user-xyz`, { method: "DELETE" });
    assertEq(noneRes.status, 404, "DELETE inesistente → 404");
    log("✅", "404 atteso confermato");

    section("STEP 3: DELETE customer (cleanup atomico cart/reservation/orders/user)");
    const delRes = await client.http(`/api/admin/users/${customer.id}`, { method: "DELETE" });
    await assertOk(delRes, "DELETE /api/admin/users/{id}");
    log("✅", `delete status=${delRes.status}`);

    const userAfter = await prisma.user.findUnique({ where: { id: customer.id } });
    assertEq(userAfter, null, "user eliminato");

    const cartAfter = await prisma.cartItem.count({ where: { userId: customer.id } });
    assertEq(cartAfter, 0, "cartItems eliminati");

    const resAfter = await prisma.cartReservation.count({ where: { userId: customer.id } });
    assertEq(resAfter, 0, "cartReservation eliminate");

    const ordersAfter = await prisma.order.count({ where: { userId: customer.id } });
    assertEq(ordersAfter, 0, "orders eliminate");

    const itemsAfter = await prisma.orderItem.count({ where: { order: { userId: customer.id } } });
    assertEq(itemsAfter, 0, "orderItems eliminati");

    console.log("\n=== admin-delete-user: TUTTO OK ===");
  } finally {
    section("Cleanup");
    await cleanupUserByEmail(ADMIN_EMAIL);
    await cleanupUserByEmail(CUSTOMER_EMAIL);
    await cleanupProduct(product.id);
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
