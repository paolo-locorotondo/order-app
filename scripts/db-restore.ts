/**
 * Ripristino di un backup `.dump` via `pg_restore`. OPERAZIONE DISTRUTTIVA:
 * sovrascrive gli oggetti del DB di destinazione.
 *
 * Uso:  npm run db:restore -- <file.dump> --yes
 *   - <file.dump>: percorso del backup (es. backups/order-app-YYYYMMDD-HHMMSS.dump)
 *   - --yes      : conferma obbligatoria (senza, lo script si ferma e mostra il target)
 *
 * Target: DIRECT_URL (.env). Per migrare verso un NUOVO provider, punta
 * temporaneamente DIRECT_URL al nuovo DB (vuoto) e lancia il restore. Vedi README.
 *
 * `--clean --if-exists` droppa gli oggetti esistenti prima di ricrearli: così il
 * restore è ripetibile. Restore su DB VUOTO = replica esatta (incl. _prisma_migrations).
 *
 * PREREQUISITO: `pg_restore` installato e su PATH, versione >= server Postgres.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { parsePgConnection } from "./pg-conn";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const confirmed = args.includes("--yes");

const rawConnection = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!rawConnection) {
    console.error("❌ DIRECT_URL (o DATABASE_URL) non impostata in .env");
    process.exit(1);
}
// Estrae le PG* env vars (password letterale in PGPASSWORD → niente problemi di
// percent-encoding). `database` serve a pg_restore come target `--dbname`.
const { database, env: pgEnv } = parsePgConnection(rawConnection);

if (!file) {
    console.error("❌ Specifica il file di backup: npm run db:restore -- <file.dump> --yes");
    process.exit(1);
}
if (!existsSync(file)) {
    console.error(`❌ File non trovato: ${file}`);
    process.exit(1);
}

let hostLabel = "(sconosciuto)";
try {
    hostLabel = new URL(rawConnection).host;
} catch {
    /* ignora */
}

if (!confirmed) {
    console.error("⚠️  RESTORE DISTRUTTIVO — conferma richiesta.");
    console.error(`   File:   ${file}`);
    console.error(`   Target: ${hostLabel}  ← verrà SOVRASCRITTO`);
    console.error("\n   Se è davvero il DB giusto, ri-lancia con --yes in coda:");
    console.error(`   npm run db:restore -- ${file} --yes`);
    process.exit(1);
}

console.log(`▶ Restore di ${file}`);
console.log(`  → ${hostLabel} (sovrascrittura in corso)`);

// Cattura stderr (invece di inherit) per poter distinguere errori benigni da
// quelli reali. pg_restore può uscire con status != 0 anche per soli warning.
const result = spawnSync(
    "pg_restore",
    [
        "--clean",           // droppa gli oggetti prima di ricrearli
        "--if-exists",       // niente errori se un oggetto non esiste ancora
        "--no-owner",
        "--no-privileges",
        "--dbname", database, // connette via PG* env vars; --dbname = modalità restore-su-DB
        file,
    ],
    { encoding: "utf8", env: { ...process.env, ...pgEnv } },
);

if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
        console.error("\n❌ `pg_restore` non trovato. Installa i client tool PostgreSQL e mettili nel PATH.");
    } else {
        console.error("\n❌ Errore nell'esecuzione di pg_restore:", result.error.message);
    }
    process.exit(1);
}

const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";
if (stdout.trim()) process.stdout.write(stdout);
if (stderr.trim()) process.stderr.write(stderr);

// Errori benigni che NON compromettono i dati ripristinati:
//  - SET di GUC introdotti da Postgres recenti (es. transaction_timeout in PG17)
//    che un server target più vecchio del client pg_dump non conosce;
//  - "does not exist, skipping" generato da --clean --if-exists su DB vuoto.
const BENIGN_PATTERNS = [
    /unrecognized configuration parameter "(transaction_timeout|idle_session_timeout|idle_in_transaction_session_timeout)"/i,
    /does not exist, skipping/i,
];

const errorLines = stderr
    .split(/\r?\n/)
    .filter((l) => /\berror:/i.test(l) && !/errors ignored on restore/i.test(l));
const realErrors = errorLines.filter((l) => !BENIGN_PATTERNS.some((re) => re.test(l)));

if (realErrors.length > 0) {
    console.error(`\n❌ Restore terminato con ${realErrors.length} error${realErrors.length === 1 ? "e" : "i"} non gestit${realErrors.length === 1 ? "o" : "i"}. Controlla l'output sopra.`);
    process.exit(1);
}

if (errorLines.length > 0) {
    console.log(`\n✅ Restore completato. ${errorLines.length} SET di versione ignorat${errorLines.length === 1 ? "o" : "i"} (innocui: il server target è più vecchio del pg_dump usato; i dati NON sono impattati).`);
} else {
    console.log("\n✅ Restore completato.");
}
