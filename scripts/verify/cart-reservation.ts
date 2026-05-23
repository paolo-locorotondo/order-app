import "dotenv/config";
import { prisma, disconnectPrisma } from "./_lib/prisma";
import { createHttpClient, checkServerReachable } from "./_lib/http";
import { login } from "./_lib/auth";
import { upsertTestUser } from "./_lib/fixtures";
import { log, section, assertEq, assertOk } from "./_lib/assert";

const TEST_EMAIL = "verify-test@example.com";
const TEST_PASSWORD = "verifypwd123";

async function setupTestUser() {
  const user = await upsertTestUser({ email: TEST_EMAIL, password: TEST_PASSWORD, role: "CUSTOMER" });

  await prisma.cartReservation.deleteMany({ where: { userId: user.id } });
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  await prisma.inventory.updateMany({ data: { reserved: 0 } });

  const laptop = await prisma.product.findFirst({ where: { slug: "laptop-gaming" } });
  if (!laptop) throw new Error("Prodotto Laptop Gaming non trovato (esegui seed)");
  await prisma.inventory.upsert({
    where: { productId: laptop.id },
    update: { quantity: 5, reserved: 0 },
    create: { productId: laptop.id, quantity: 5, reserved: 0 },
  });

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId: user.id, productId: laptop.id } },
    update: { quantity: 1 },
    create: { userId: user.id, productId: laptop.id, quantity: 1 },
  });

  return { user, productId: laptop.id };
}

async function dbState(userId: string, productId: string) {
  const inv = await prisma.inventory.findUnique({ where: { productId } });
  const reservations = await prisma.cartReservation.findMany({
    where: { userId },
    include: { items: true },
  });
  return {
    quantity: inv?.quantity,
    reserved: inv?.reserved,
    reservationCount: reservations.length,
    reservation: reservations[0]
      ? {
          expiresAtMs: reservations[0].expiresAt.getTime(),
          items: reservations[0].items.map((i) => ({ productId: i.productId, qty: i.quantity })),
        }
      : null,
  };
}

async function main() {
  await checkServerReachable();
  const client = createHttpClient();

  section("Setup");
  const { user, productId } = await setupTestUser();
  log("✓", `Utente test ${user.id}`);

  await login(client, TEST_EMAIL, TEST_PASSWORD);
  log("✓", "Login OK");

  let s = await dbState(user.id, productId);
  log("ℹ", "Stato iniziale", s);
  assertEq(s.quantity, 5, "quantity iniziale");
  assertEq(s.reserved, 0, "reserved iniziale");
  assertEq(s.reservationCount, 0, "reservationCount iniziale");

  // ---- STEP 1: prima POST /api/cart/reserve ----
  section("STEP 1: POST /api/cart/reserve (prima volta)");
  const r1 = await client.http("/api/cart/reserve", { method: "POST" });
  await assertOk(r1, "POST reserve #1");
  const r1json = await r1.json();
  log("✅", `status=${r1.status}`, r1json);
  s = await dbState(user.id, productId);
  log("ℹ", "DB", s);
  assertEq(s.reserved, 1, "reserved dopo reserve");
  assertEq(s.reservationCount, 1, "reservationCount dopo reserve");
  const firstExpires = s.reservation?.expiresAtMs;

  // ---- STEP 2: PROBE - seconda POST rapida (Strict Mode race) ----
  section("STEP 2 🔍 PROBE: doppia POST concorrente (Strict Mode race)");
  const [r2a, r2b] = await Promise.all([
    client.http("/api/cart/reserve", { method: "POST" }),
    client.http("/api/cart/reserve", { method: "POST" }),
  ]);
  const [r2aj, r2bj] = await Promise.all([r2a.json(), r2b.json()]);
  log("🔍", `parallel POST: status=${r2a.status},${r2b.status}`, { a: r2aj, b: r2bj });
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo doppia POST", s);
  assertEq(s.reserved, 1, "reserved deve restare 1 (idempotenza)");
  assertEq(s.reservationCount, 1, "reservationCount deve restare 1");

  // ---- STEP 3: GET /api/cart/reserve (riprende reservation, simula reload) ----
  section("STEP 3: GET /api/cart/reserve (simula reload checkout)");
  const r3 = await client.http("/api/cart/reserve", { method: "GET" });
  await assertOk(r3, "GET reserve");
  const r3json = (await r3.json()) as { data: { reservation: { expiresAt: string } | null } };
  log("✅", `status=${r3.status}`, r3json);
  if (!r3json.data?.reservation?.expiresAt) {
    throw new Error("GET deve ritornare la reservation esistente");
  }
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo GET", s);
  assertEq(s.reserved, 1, "GET non deve modificare reserved");
  assertEq(s.reservationCount, 1, "GET non deve modificare reservationCount");
  assertEq(s.reservation?.expiresAtMs, firstExpires, "GET non deve cambiare expiresAt");

  // ---- STEP 4: POST /api/cart/release (Torna al carrello) ----
  section("STEP 4: POST /api/cart/release");
  const r4 = await client.http("/api/cart/release", { method: "POST" });
  await assertOk(r4, "POST release");
  const r4json = await r4.json();
  log("✅", `status=${r4.status}`, r4json);
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo release", s);
  assertEq(s.reserved, 0, "reserved dopo release");
  assertEq(s.reservationCount, 0, "reservationCount dopo release");

  // ---- STEP 5: ricrea reservation + completa ordine ----
  section("STEP 5: POST reserve + POST /api/orders (ordine completo)");
  const r5a = await client.http("/api/cart/reserve", { method: "POST" });
  await assertOk(r5a, "reserve pre-ordine");
  await r5a.json();
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo nuova reserve", s);
  assertEq(s.reserved, 1, "reserved dopo nuova reserve");

  const r5b = await client.http("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: "Via Test 123, Milano", paymentMethod: "CASH" }),
  });
  await assertOk(r5b, "POST /api/orders");
  const r5bj = (await r5b.json()) as { data?: { id: string }; error?: unknown };
  log("✅", `POST /api/orders status=${r5b.status}`, r5bj);
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo ordine", s);
  assertEq(s.quantity, 4, "quantity dopo ordine (5-1)");
  assertEq(s.reserved, 0, "reserved dopo ordine");
  assertEq(s.reservationCount, 0, "CartReservation deve essere cancellata");
  const cartLeft = await prisma.cartItem.count({ where: { userId: user.id } });
  assertEq(cartLeft, 0, "Cart deve essere svuotato");

  // ---- STEP 6 PROBE: order POST senza reservation valida ----
  section("STEP 6 🔍 PROBE: POST /api/orders senza reservation");
  await prisma.cartItem.create({ data: { userId: user.id, productId, quantity: 1 } });
  const r6 = await client.http("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: "Via Test 123, Milano", paymentMethod: "CASH" }),
  });
  const r6j = await r6.json();
  log("🔍", `status=${r6.status}`, r6j);
  if (r6.ok) throw new Error("Atteso fallimento (no reservation)");

  // ---- STEP 7 PROBE: reservation scaduta gestita correttamente ----
  section("STEP 7 🔍 PROBE: reservation scaduta");
  await prisma.cartReservation.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() - 60_000),
      items: { create: [{ productId, quantity: 1 }] },
    },
  });
  await prisma.inventory.update({
    where: { productId },
    data: { reserved: { increment: 1 } },
  });
  const r7 = await client.http("/api/cart/reserve", { method: "POST" });
  await assertOk(r7, "reserve su expired");
  const r7j = (await r7.json()) as { data?: { expiresAt: string; reused?: boolean } };
  log("🔍", `POST con reservation scaduta status=${r7.status}`, r7j);
  if (r7j.data?.reused) throw new Error("Atteso reused=false (vecchia era scaduta)");
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo reserve su expired", s);
  assertEq(s.reservationCount, 1, "Vecchia reservation deve essere stata sostituita");

  // cleanup finale
  await prisma.cartReservation.deleteMany({ where: { userId: user.id } });
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  await prisma.inventory.update({ where: { productId }, data: { reserved: 0 } });

  console.log("\n=== TUTTO OK ===");
}

main()
  .then(() => disconnectPrisma())
  .catch(async (e) => {
    console.error("❌ FAIL:", e?.message ?? e);
    if (e?.stack) console.error(e.stack);
    await disconnectPrisma();
    process.exit(1);
  });
