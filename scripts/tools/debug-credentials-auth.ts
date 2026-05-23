import "dotenv/config";
import bcryptjs from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const TEST_EMAIL = "verify-test@example.com";
const TEST_PASSWORD = "verifypwd123";

const cookies: Record<string, string> = {};

function buildCookieHeader() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

function ingestSetCookie(res: Response) {
  const list: string[] = res.headers.getSetCookie?.() ?? [];
  for (const raw of list) {
    const [pair] = raw.split(";");
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value === "" || value === "deleted") {
      delete cookies[name];
    } else {
      cookies[name] = value;
    }
  }
}

async function http(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (Object.keys(cookies).length) headers.set("cookie", buildCookieHeader());
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
  ingestSetCookie(res);
  return res;
}

async function main() {
  // Setup test user
  const hash = await bcryptjs.hash(TEST_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: { password: hash },
    create: { email: TEST_EMAIL, name: "Verify", password: hash, role: "CUSTOMER" },
  });
  console.log("→ Test user id:", user.id);

  // Login Credentials
  const csrf = (await (await http("/api/auth/csrf")).json()) as { csrfToken: string };
  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    redirect: "false",
    callbackUrl: BASE_URL,
    json: "true",
  });
  await http("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  console.log("\n→ Cookies dopo login:");
  for (const [k, v] of Object.entries(cookies)) {
    console.log(`   ${k} (len=${v.length})`);
  }

  // Test session
  const sess = await (await http("/api/auth/session")).json() as { user?: { id?: string; email?: string } };
  console.log("\n→ /api/auth/session:", sess);

  // Test middleware-protected route — usa un product id reale
  const product = await prisma.product.findFirst();
  console.log("\n→ Probe routes (middleware):");
  const paths = [
    "/shop",
    `/shop/products/${product?.id}`,
    "/shop/cart",
    "/shop/checkout",
    "/api/cart",
  ];
  for (const path of paths) {
    const res = await http(path, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
    });
    const loc = res.headers.get("location");
    console.log(`   ${path}: status=${res.status}${loc ? ` → ${loc}` : ""}`);
  }

  // Cookies dopo le navigazioni
  console.log("\n→ Cookies dopo le navigazioni:");
  for (const [k, v] of Object.entries(cookies)) {
    console.log(`   ${k} (len=${v.length})`);
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
