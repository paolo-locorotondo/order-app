# Order App (Next.js + PostgreSQL + Google Auth)

Progetto di gestione ordini con autenticazione Google (NextAuth), database Prisma/PostgreSQL, carrello e dashboard admin.

## Prerequisiti

- Node.js >= 18.18
- Docker (per database locale)

## Setup

1. `npm install`
2. Copia `.env` da `.env.example` (o modifica `.env` esistente)
3. Imposta `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SENDGRID_API_KEY`
4. Avvia database: `docker-compose up -d`
5. `npx prisma db push`
6. `npx prisma generate`
7. `npm run db:seed` (opzionale, per dati di test)

## Configurazione Ambiente

Il progetto richiede diverse variabili d'ambiente per funzionare correttamente. Copia il file `.env.example` in `.env` e configura i valori seguenti:

### Database
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/order_app?schema=public"
```
**Connessione PostgreSQL**: URL completo per accedere al database. Se usi Docker (consigliato), mantieni questo valore. Per produzione usa l'URL del tuo provider database.

### Autenticazione
```env
NEXTAUTH_SECRET="your-secret-here"
```
**Chiave segreta NextAuth**: Genera una chiave sicura con `openssl rand -base64 32`. Usata per firmare JWT e proteggere le sessioni.

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```
**OAuth Google**: 
- Vai su [Google Cloud Console](https://console.cloud.google.com/)
- Crea progetto → Abilita Google+ API → Credentials → OAuth 2.0 Client ID
- Aggiungi redirect URI: `http://localhost:3000/api/auth/callback/google` (sviluppo)

### Email (Opzionale)
```env
SENDGRID_API_KEY="your-sendgrid-api-key"
```
**SendGrid API Key**: Per invio email automatiche (conferme ordini, notifiche). Registrati su [SendGrid](https://sendgrid.com/) per ottenere la chiave.

### Sicurezza
- **NON committare mai** il file `.env` su Git
- Usa chiavi diverse per sviluppo e produzione
- Genera sempre nuove chiavi segrete per produzione

## Esecuzione

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

## Comandi utili

- `npm run dev` - avvia server sviluppo
- `npm run build` - build di produzione
- `npm run lint` - linter
- `npm run db:seed` - popola DB con dati di test
- `npx prisma studio` - visualizza DB
- `docker-compose up -d` - avvia Postgres
- `docker-compose down` - ferma Postgres

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
