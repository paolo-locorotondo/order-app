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
import { log, section, assertEq, assertOk } from "./_lib/assert";

const ADMIN_EMAIL = "verify-admin@example.com";
const ADMIN_PASSWORD = "verifyadmin123";
const CUSTOMER_EMAIL = "verify-customer@example.com";
const CUSTOMER_PASSWORD = "verifycustomer123";

async function main() {
  await checkServerReachable();

  section("Setup admin-delete-order");
  const admin = await upsertTestUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "ADMIN", name: "Verify Admin" });
  const customer = await upsertTestUser({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, role: "CUSTOMER", name: "Verify Customer" });
  const product = await createTestProduct({ stock: 10, price: 25 });
  log("✓", `admin=${admin.id} customer=${customer.id} product=${product.id} (stock=10)`);

  const client = createHttpClient();
  await login(client, ADMIN_EMAIL, ADMIN_PASSWORD);
  log("✓", "Admin login OK");

  try {
    section("STEP 1: POST /api/admin/orders (crea ordine, decrementa inventory)");
    const createRes = await client.http("/api/admin/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: customer.id,
        items: [{ productId: product.id, quantity: 3 }],
        address: "Via Verify 123, Milano",
        paymentMethod: "CASH",
      }),
    });
    await assertOk(createRes, "POST /api/admin/orders");
    const createJson = (await createRes.json()) as { data: { id: string } };
    const orderId = createJson.data.id;
    log("✅", `order created id=${orderId}`);

    let inv = await getInventory(product.id);
    log("ℹ", "inventory dopo create", inv);
    assertEq(inv?.quantity, 7, "quantity dopo create (10-3)");

    section("STEP 2: DELETE /api/admin/orders/{id} (restore atomico)");
    const delRes = await client.http(`/api/admin/orders/${orderId}`, { method: "DELETE" });
    await assertOk(delRes, "DELETE /api/admin/orders/{id}");
    log("✅", `delete status=${delRes.status}`);

    inv = await getInventory(product.id);
    log("ℹ", "inventory dopo delete", inv);
    assertEq(inv?.quantity, 10, "quantity restored a 10");

    const orderAfter = await prisma.order.findUnique({ where: { id: orderId } });
    assertEq(orderAfter, null, "order eliminato");
    const itemsAfter = await prisma.orderItem.count({ where: { orderId } });
    assertEq(itemsAfter, 0, "orderItems eliminati");

    section("STEP 3: DELETE su id inesistente → 404");
    const del404 = await client.http("/api/admin/orders/non-existent-id-xyz", { method: "DELETE" });
    assertEq(del404.status, 404, "DELETE inesistente → 404");
    log("✅", "404 atteso confermato");

    console.log("\n=== admin-delete-order: TUTTO OK ===");
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
