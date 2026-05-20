import "dotenv/config";
import bcryptjs from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const TEST_EMAIL = "verify-test@example.com";
const TEST_PASSWORD = "verifypwd123";

// Cookie jar per la sessione
const cookies: Record<string, string> = {};

function buildCookieHeader(): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function ingestSetCookie(res: Response) {
  // Node fetch supporta getSetCookie() (Node 20+)
  const list: string[] = res.headers.getSetCookie?.() ?? [];
  for (const raw of list) {
    const [pair] = raw.split(";");
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[name] = value;
  }
}

async function http(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (Object.keys(cookies).length) headers.set("cookie", buildCookieHeader());
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
  ingestSetCookie(res);
  return res;
}

function log(emoji: string, msg: string, extra?: unknown) {
  if (extra !== undefined) console.log(`${emoji} ${msg}`, extra);
  else console.log(`${emoji} ${msg}`);
}

async function setupTestUser() {
  // crea o trova utente test
  const passwordHash = await bcryptjs.hash(TEST_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: { password: passwordHash },
    create: { email: TEST_EMAIL, name: "Verify Test", password: passwordHash, role: "CUSTOMER" },
  });

  // pulisci stato pregresso
  await prisma.cartReservation.deleteMany({ where: { userId: user.id } });
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  await prisma.inventory.updateMany({ data: { reserved: 0 } });

  // assicura che Laptop Gaming abbia almeno quantity 5
  const laptop = await prisma.product.findFirst({ where: { slug: "laptop-gaming" } });
  if (!laptop) throw new Error("Prodotto Laptop Gaming non trovato (esegui seed)");
  await prisma.inventory.upsert({
    where: { productId: laptop.id },
    update: { quantity: 5, reserved: 0 },
    create: { productId: laptop.id, quantity: 5, reserved: 0 },
  });

  // metti 1 unità nel carrello
  await prisma.cartItem.upsert({
    where: { userId_productId: { userId: user.id, productId: laptop.id } },
    update: { quantity: 1 },
    create: { userId: user.id, productId: laptop.id, quantity: 1 },
  });

  return { user, productId: laptop.id };
}

async function login() {
  // 1. CSRF token
  const csrfRes = await http("/api/auth/csrf");
  const csrf = (await csrfRes.json()) as { csrfToken: string };

  // 2. POST credentials callback
  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    redirect: "false",
    callbackUrl: `${BASE_URL}/`,
    json: "true",
  });
  const loginRes = await http("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  // 3. verifica sessione
  const sessionRes = await http("/api/auth/session");
  const session = (await sessionRes.json()) as { user?: { email?: string } };
  if (!session?.user?.email) {
    throw new Error(`Login fallito. status=${loginRes.status} sessione=${JSON.stringify(session)}`);
  }
  return session;
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
  console.log("=== Setup ===");
  const { user, productId } = await setupTestUser();
  log("✓", `Utente test ${user.id}`);

  await login();
  log("✓", `Login OK`);

  let s = await dbState(user.id, productId);
  log("ℹ", "Stato iniziale", s);
  if (s.quantity !== 5 || s.reserved !== 0 || s.reservationCount !== 0) {
    throw new Error("Stato iniziale non pulito");
  }

  // ---- STEP 1: prima POST /api/cart/reserve ----
  console.log("\n=== STEP 1: POST /api/cart/reserve (prima volta) ===");
  const r1 = await http("/api/cart/reserve", { method: "POST" });
  const r1json = await r1.json();
  log(r1.ok ? "✅" : "❌", `status=${r1.status}`, r1json);
  s = await dbState(user.id, productId);
  log("ℹ", "DB", s);
  if (s.reserved !== 1 || s.reservationCount !== 1) {
    throw new Error(`Atteso reserved=1 e 1 reservation, ottenuto reserved=${s.reserved} count=${s.reservationCount}`);
  }
  const firstExpires = s.reservation?.expiresAtMs;

  // ---- STEP 2: PROBE - seconda POST rapida (Strict Mode race) ----
  console.log("\n=== STEP 2 🔍 PROBE: doppia POST concorrente (Strict Mode race) ===");
  const [r2a, r2b] = await Promise.all([
    http("/api/cart/reserve", { method: "POST" }),
    http("/api/cart/reserve", { method: "POST" }),
  ]);
  const [r2aj, r2bj] = await Promise.all([r2a.json(), r2b.json()]);
  log("🔍", `parallel POST: status=${r2a.status},${r2b.status}`, { a: r2aj, b: r2bj });
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo doppia POST", s);
  if (s.reserved !== 1) {
    throw new Error(`reserved deve restare 1 (idempotenza), ottenuto ${s.reserved}`);
  }
  if (s.reservationCount !== 1) {
    throw new Error(`reservationCount deve restare 1, ottenuto ${s.reservationCount}`);
  }

  // ---- STEP 3: GET /api/cart/reserve (riprende reservation, simula reload) ----
  console.log("\n=== STEP 3: GET /api/cart/reserve (simula reload checkout) ===");
  const r3 = await http("/api/cart/reserve", { method: "GET" });
  const r3json = (await r3.json()) as { data: { reservation: { expiresAt: string } | null } };
  log(r3.ok ? "✅" : "❌", `status=${r3.status}`, r3json);
  if (!r3json.data?.reservation?.expiresAt) {
    throw new Error("GET deve ritornare la reservation esistente");
  }
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo GET", s);
  if (s.reserved !== 1 || s.reservationCount !== 1) {
    throw new Error("GET non deve modificare lo stato");
  }
  if (s.reservation?.expiresAtMs !== firstExpires) {
    throw new Error("GET non deve cambiare expiresAt");
  }

  // ---- STEP 4: POST /api/cart/release (Torna al carrello) ----
  console.log("\n=== STEP 4: POST /api/cart/release ===");
  const r4 = await http("/api/cart/release", { method: "POST" });
  const r4json = await r4.json();
  log(r4.ok ? "✅" : "❌", `status=${r4.status}`, r4json);
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo release", s);
  if (s.reserved !== 0 || s.reservationCount !== 0) {
    throw new Error(`Atteso reserved=0 e 0 reservation, ottenuto reserved=${s.reserved} count=${s.reservationCount}`);
  }

  // ---- STEP 5: ricrea reservation + completa ordine ----
  console.log("\n=== STEP 5: POST reserve + POST /api/orders (ordine completo) ===");
  const r5a = await http("/api/cart/reserve", { method: "POST" });
  await r5a.json();
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo nuova reserve", s);
  if (s.reserved !== 1) throw new Error("Nuova reserve fallita");

  const r5b = await http("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: "Via Test 123, Milano", paymentMethod: "CASH" }),
  });
  const r5bj = (await r5b.json()) as { data?: { id: string }; error?: unknown };
  log(r5b.ok ? "✅" : "❌", `POST /api/orders status=${r5b.status}`, r5bj);
  if (!r5b.ok) throw new Error("Ordine fallito");
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo ordine", s);
  if (s.quantity !== 4) throw new Error(`Atteso quantity=4 (5-1), ottenuto ${s.quantity}`);
  if (s.reserved !== 0) throw new Error(`Atteso reserved=0, ottenuto ${s.reserved}`);
  if (s.reservationCount !== 0) throw new Error(`CartReservation deve essere cancellata`);
  const cartLeft = await prisma.cartItem.count({ where: { userId: user.id } });
  if (cartLeft !== 0) throw new Error(`Cart deve essere svuotato, restano ${cartLeft}`);

  // ---- STEP 6 PROBE: order POST senza reservation valida ----
  console.log("\n=== STEP 6 🔍 PROBE: POST /api/orders senza reservation ===");
  await prisma.cartItem.create({ data: { userId: user.id, productId, quantity: 1 } });
  const r6 = await http("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: "Via Test 123, Milano", paymentMethod: "CASH" }),
  });
  const r6j = await r6.json();
  log("🔍", `status=${r6.status}`, r6j);
  if (r6.ok) throw new Error("Atteso fallimento (no reservation)");

  // ---- STEP 7 PROBE: reservation scaduta gestita correttamente ----
  console.log("\n=== STEP 7 🔍 PROBE: reservation scaduta ===");
  // crea manualmente reservation scaduta
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
  const r7 = await http("/api/cart/reserve", { method: "POST" });
  const r7j = (await r7.json()) as { data?: { expiresAt: string; reused?: boolean } };
  log("🔍", `POST con reservation scaduta status=${r7.status}`, r7j);
  if (!r7.ok) throw new Error("Atteso 200 (creazione nuova reservation)");
  if (r7j.data?.reused) throw new Error("Atteso reused=false (vecchia era scaduta)");
  s = await dbState(user.id, productId);
  log("ℹ", "DB dopo reserve su expired", s);
  if (s.reservationCount !== 1) throw new Error("Vecchia reservation deve essere stata sostituita");

  // cleanup finale
  await prisma.cartReservation.deleteMany({ where: { userId: user.id } });
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  await prisma.inventory.update({ where: { productId }, data: { reserved: 0 } });

  console.log("\n=== TUTTO OK ===");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ FAIL:", e?.message ?? e);
    if (e?.stack) console.error(e.stack);
    await prisma.$disconnect();
    process.exit(1);
  });
