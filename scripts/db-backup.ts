/**
 * Backup completo del database via `pg_dump` (formato custom compresso).
 *
 * Uso:  npm run db:backup
 *
 * Legge la connection string da DIRECT_URL (.env) — la connessione diretta
 * (porta 5432), non il pooler, perché pg_dump richiede una sessione completa.
 * Produce un file timestamped in `backups/`, escluso da git.
 *
 * Il dump custom (`-Fc`) include schema + dati + la tabella `_prisma_migrations`,
 * quindi un restore su un DB vuoto ricrea una replica ESATTA (storia migration
 * inclusa → Prisma la riconosce senza `migrate resolve`). Vedi README.
 *
 * PREREQUISITO: `pg_dump` installato e su PATH, versione >= a quella del server
 * Postgres (Supabase oggi gira su Postgres 15/17 → serve un client recente).
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parsePgConnection } from "./pg-conn";

const rawConnection = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!rawConnection) {
    console.error("❌ DIRECT_URL (o DATABASE_URL) non impostata in .env");
    process.exit(1);
}
// Estrae le variabili PG* (host/porta/user/password/db) e lo schema. La password
// va in PGPASSWORD letterale → niente problemi di percent-encoding nell'URI.
const { schema, env: pgEnv } = parsePgConnection(rawConnection);

// Timestamp YYYYMMDD-HHMMSS in locale per ordinare i file cronologicamente.
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const backupsDir = join(process.cwd(), "backups");
mkdirSync(backupsDir, { recursive: true });
const outFile = join(backupsDir, `order-app-${stamp}.dump`);

// Host visibile per conferma (senza credenziali).
let hostLabel = "(sconosciuto)";
try {
    hostLabel = new URL(rawConnection).host;
} catch {
    /* connection string non-URL: ignora */
}

console.log(`▶ Backup da ${hostLabel}`);
console.log(`  → ${outFile}`);

const result = spawnSync(
    "pg_dump",
    [
        "--format=custom",   // -Fc: compresso, restorabile con pg_restore
        "--no-owner",        // portabilità: niente OWNER (utenti diversi tra provider)
        "--no-privileges",   // niente GRANT/REVOKE specifici del provider
        "--schema", schema,  // solo lo schema dell'app (es. public), non auth/storage di Supabase
        "--file", outFile,
        // niente connection string positional: pg_dump usa le PG* env vars sotto.
    ],
    { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, ...pgEnv } },
);

if (result.error) {
    // ENOENT tipicamente = pg_dump non trovato su PATH.
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
        console.error("\n❌ `pg_dump` non trovato. Installa i client tool PostgreSQL e assicurati che siano nel PATH.");
        console.error("   Windows: https://www.postgresql.org/download/windows/ (installa anche 'Command Line Tools')");
    } else {
        console.error("\n❌ Errore nell'esecuzione di pg_dump:", result.error.message);
    }
    process.exit(1);
}

if (result.status !== 0) {
    console.error(`\n❌ pg_dump terminato con codice ${result.status}. Backup NON creato.`);
    console.error("   Causa frequente: versione di pg_dump più vecchia del server. Aggiorna i client PostgreSQL.");
    process.exit(result.status ?? 1);
}

const sizeMb = (statSync(outFile).size / (1024 * 1024)).toFixed(2);
console.log(`\n✅ Backup completato (${sizeMb} MB).`);
console.log(`   Ripristino: npm run db:restore -- ${outFile} --yes`);
