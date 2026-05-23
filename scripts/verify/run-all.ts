import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { checkServerReachable } from "./_lib/http";

interface SmokeJob {
  name: string;
  file: string;
}

const SMOKES: SmokeJob[] = [
  { name: "cart-reservation", file: "cart-reservation.ts" },
  { name: "admin-delete-order", file: "admin-delete-order.ts" },
  { name: "admin-delete-user", file: "admin-delete-user.ts" },
  { name: "admin-delete-product", file: "admin-delete-product.ts" },
];

function runScript(file: string): Promise<number> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, file);
    const child = spawn("npx", ["tsx", scriptPath], {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  console.log("=== run-all smokes ===");
  await checkServerReachable();
  console.log("✓ server reachable\n");

  const results: { name: string; ok: boolean }[] = [];
  for (const job of SMOKES) {
    console.log(`\n─── ▶ ${job.name} ───`);
    const start = Date.now();
    const code = await runScript(job.file);
    const ms = Date.now() - start;
    const ok = code === 0;
    results.push({ name: job.name, ok });
    console.log(`─── ${ok ? "✅" : "❌"} ${job.name} (${ms}ms, exit=${code}) ───`);
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  if (failed > 0) {
    console.error(`\n❌ ${failed}/${results.length} smoke FAILED`);
    process.exit(1);
  }
  console.log(`\n✅ Tutti gli smoke passati (${results.length}/${results.length})`);
}

main().catch((e) => {
  console.error("❌ run-all error:", e);
  process.exit(1);
});
