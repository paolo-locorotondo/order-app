# scripts/

Script operativi lanciati da terminale (via `tsx`), non parte del runtime Next.js.

| Script | Comando | Descrizione |
|---|---|---|
| `db-backup.ts` | `npm run db:backup` | Backup completo del DB |
| `db-restore.ts` | `npm run db:restore -- <file> --yes` | Ripristino di un backup (distruttivo) |
| `db-seed` (in `prisma/seed.ts`) | `npm run db:seed` | Popola il DB con dati di test |
| `verify/*` | `npm run verify` | Smoke test su flussi critici (cart, delete admin) |

---

## Backup e ripristino del database

Backup completo del database (schema + dati + storia migration Prisma) via
`pg_dump`/`pg_restore`. Utile per: snapshot periodici, disaster recovery e
**migrazione verso un nuovo provider** (es. cambiare progetto Supabase) senza
perdere i dati.

> **Perché `pg_dump` e non un export JSON in-app?** È lo strumento standard,
> completo (gestisce FK, enum, ordine di inserimento) e gratuito con Supabase.
> Il dump in formato custom include anche la tabella `_prisma_migrations`,
> quindi un restore su un DB vuoto produce una **replica esatta** e Prisma
> riconosce la storia delle migration senza `migrate resolve`.

### Prerequisito: client PostgreSQL

Servono `pg_dump` e `pg_restore` nel PATH, di versione **≥** a quella del server
(Supabase oggi gira su Postgres 15/17 → usa un client recente, altrimenti il
dump fallisce con un errore di versione).

- **Windows**: installa PostgreSQL da [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) includendo i "Command Line Tools", poi aggiungi `C:\Program Files\PostgreSQL\<versione>\bin` al PATH.
- **macOS**: `brew install postgresql@17` (o `libpq` + PATH).
- **Linux**: `sudo apt install postgresql-client-17` (o equivalente).

Verifica: `pg_dump --version`.

### Backup

```bash
npm run db:backup
```

Legge `DIRECT_URL` da `.env` (connessione diretta, porta 5432 — non il pooler) e
crea `backups/order-app-YYYYMMDD-HHMMSS.dump` (cartella git-ignored). Conserva
i file dove vuoi (Drive, disco esterno, ecc.).

### Ripristino su un DB esistente (disaster recovery)

⚠️ **Distruttivo**: sovrascrive il DB puntato da `DIRECT_URL`.

```bash
npm run db:restore -- backups/order-app-YYYYMMDD-HHMMSS.dump --yes
```

Senza `--yes` lo script si ferma e mostra l'host di destinazione per conferma.

> **Versioni Postgres**: idealmente il server di destinazione ha una versione
> **≥** del `pg_dump` usato per creare il backup. Se ripristini un dump fatto con
> un `pg_dump` più recente su un server più vecchio (es. dump con client 18 →
> Postgres 15 locale), pg_restore può segnalare `unrecognized configuration
> parameter "transaction_timeout"`: è **innocuo** (è un timeout di sessione, i
> dati vengono ripristinati comunque). Lo script riconosce questi SET di versione
> e riporta comunque successo, distinguendoli dagli errori reali. Per un
> round-trip locale pulito allinea il Postgres del `docker-compose.yml` alla
> versione del tuo client.

### Migrazione verso un nuovo provider (cambia DB)

1. Crea il nuovo database (vuoto) sul nuovo provider.
2. Fai un backup del DB attuale: `npm run db:backup`.
3. Punta **temporaneamente** `DIRECT_URL` (e `DATABASE_URL`) nel `.env` al nuovo DB.
4. Ripristina: `npm run db:restore -- backups/<file>.dump --yes`.
   - Su un DB vuoto i warning di `--clean` (`does not exist, skipping`) sono normali.
5. Verifica con `npx prisma studio` che i dati ci siano, poi aggiorna le env su
   Vercel col nuovo connection string.
