/**
 * Converte la connection string Prisma (DIRECT_URL / DATABASE_URL) in variabili
 * d'ambiente `PG*` per pg_dump/pg_restore.
 *
 * Perché env vars e non passare l'URI a pg_dump:
 *  1. Prisma mette parametri non-libpq nell'URI (`?schema=public`, `?pgbouncer`,
 *     `?connection_limit`) → "invalid URI query parameter".
 *  2. Le password Supabase contengono spesso caratteri speciali (`%`, `,`, `!`)
 *     NON percent-encodati → "invalid percent-encoded token". `PGPASSWORD`
 *     prende la password LETTERALE, eliminando ogni ambiguità di encoding.
 *
 * Ritorna:
 *  - `schema`: valore di `?schema` (default "public"), per `pg_dump --schema`;
 *  - `env`: PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE(/PGSSLMODE) da fondere
 *    nell'env del processo figlio;
 *  - `database`: nome del DB (serve a pg_restore come `--dbname`).
 */
export interface PgConnection {
    schema: string;
    database: string;
    env: Record<string, string>;
}

// Decodifica percent-encoding SOLO se valido; altrimenti restituisce il
// letterale. Gestisce sia password già encodate (`%25` → `%`) sia password
// grezze incollate da Supabase (`%H2` non è encoding valido → resta letterale).
function tryDecode(s: string): string {
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

export function parsePgConnection(raw: string): PgConnection {
    const u = new URL(raw);
    const schema = u.searchParams.get("schema") || "public";

    // User/password estratti dalla userinfo GREZZA (tra "://" e l'ultimo "@"),
    // non da u.password, per evitare la ri-serializzazione che romperebbe i `%`.
    const afterScheme = raw.slice(raw.indexOf("://") + 3);
    const atIdx = afterScheme.lastIndexOf("@");
    const userinfo = atIdx >= 0 ? afterScheme.slice(0, atIdx) : "";
    const colonIdx = userinfo.indexOf(":");
    const rawUser = colonIdx === -1 ? userinfo : userinfo.slice(0, colonIdx);
    const rawPassword = colonIdx === -1 ? "" : userinfo.slice(colonIdx + 1);

    const database = tryDecode(u.pathname.replace(/^\//, "")) || "postgres";

    const env: Record<string, string> = {
        PGHOST: u.hostname,
        PGPORT: u.port || "5432",
        PGUSER: tryDecode(rawUser),
        PGDATABASE: database,
    };
    if (rawPassword) env.PGPASSWORD = tryDecode(rawPassword);
    const sslmode = u.searchParams.get("sslmode");
    if (sslmode) env.PGSSLMODE = sslmode;

    return { schema, database, env };
}
