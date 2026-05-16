# Order App (Next.js + PostgreSQL + Google Auth)

Progetto di gestione ordini con autenticazione Google (NextAuth), database Prisma/PostgreSQL, carrello e dashboard admin.

## Prerequisiti

- Node.js >= 18.18
- Docker (per database locale)

## Setup

1. `npm install`
2. Copia `.env` da `.env.example` (o modifica `.env` esistente)
3. Imposta `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SENDGRID_API_KEY`, `SUPPORT_EMAIL`
4. Avvia database: `docker-compose up -d`
5. `npx prisma db push`
6. `npx prisma generate`
7. `npm run db:seed` (opzionale, per dati di test sicuri)

## Credenziali di Test

Dopo aver eseguito il seeding del database, puoi accedere con queste credenziali di prova:

- **Admin**: `admin@example.com` / `AdminSecure123!`
- **User**: `test@example.com` / `TestSecure456!`

> ⚠️ **Importante**: Queste password rispettano i requisiti di sicurezza minimi dell'applicazione (8+ caratteri, maiuscola, minuscola, numero, carattere speciale). In produzione, usa sempre password uniche e sicure.

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
- Le password di test rispettano i requisiti di sicurezza minimi
- In produzione, abilita sempre HTTPS e configura header di sicurezza

### Sicurezza Dati di Test
- Le credenziali di seeding sono progettate per rispettare le policy di sicurezza
- Password di test: minimo 8 caratteri, maiuscola, minuscola, numero, carattere speciale
- Usa solo per sviluppo locale - mai in produzione
- Dopo il testing, considera di rimuovere o modificare i dati di test

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

## Struttura del Progetto

```
order-app/
├── app/                            # Next.js App Router
│   ├── api/                        # API routes
│   │   ├── admin/users/            # Gestione utenti (admin)
│   │   ├── auth/                   # Autenticazione e registrazione
│   │   ├── cart/                   # Gestione carrello
│   │   ├── inventory/              # Gestione inventario
│   │   ├── orders/                 # Gestione ordini
│   │   └── products/               # Gestione prodotti
│   ├── auth/                       # Pagine autenticazione
│   │   ├── error/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                  # Dashboard
│   │   ├── admin/                  # Area admin
│   │   │   ├── inventory/
│   │   │   ├── products/
│   │   │   └── users/
│   │   └── orders/
│   ├── generated/                  # File generati da Prisma (avoid)
│   ├── shop/                       # Shop pubblico
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── order-confirmation/
│   │   └── products/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/                     # React components riutilizzabili
│   ├── AddToCartForm.tsx
│   ├── CartItemsList.tsx
│   ├── CheckoutForm.tsx
│   ├── Header.tsx
│   ├── ProductDialog.tsx
│   └── ProductForm.tsx
├── docs/                           # Documentazione
│   └── AUTHENTICATION_GOOGLE.md
├── generated/                      # File generati (avoid)
│   └── prisma/
├── lib/                            # Utility e funzioni condivise
│   ├── auth-helpers.ts
│   ├── auth.ts
│   ├── db.ts
│   └── validators.ts
├── prisma/                         # Schema e seeding database
│   ├── schema.prisma
│   └── seed.ts
├── public/                         # Asset statici
├── types/                          # Type definitions
│   └── next-auth.d.ts
├── .env                            # Variabili ambiente (git-ignored)
├── .env.example                    # Template variabili ambiente
├── docker-compose.yml              # Compose per PostgreSQL e dbAdminer
├── eslint.config.mjs
├── middleware.ts                   # Middleware NextAuth
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── prisma.config.ts
├── tsconfig.json
├── AGENTS.md                       # Configurazione agenti
├── CLAUDE.md                       # Istruzioni per Claude
├── README.md                       # Questo file
├── QUESTIONS.md                    # File usato per segnare domande e risposte
└── TODO.md                         # File usato per segnare le cose da fare
```

### Descrizione Cartelle Principali

- **`app/`**: Contiene il routing di Next.js con App Router. Divide l'applicazione in area pubblica (`shop/`), autenticazione (`auth/`), dashboard utente e admin, e API routes.
- **`components/`**: Componenti React riutilizzabili per UI (form, liste, dialoghi, ecc).
- **`lib/`**: Funzioni utility (helper di autenticazione, database, validazione).
- **`prisma/`**: Schema del database e script di seeding con dati di test.
- **`public/`**: Asset statici serviti direttamente.
- **`types/`**: Type definitions TypeScript, incluse estensioni NextAuth.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

#### Step CD/CI on Vercel

Premesse:
- Verifica che sia configurato il collegamento con git (**NB**: col piano Hobby di Vercel, sono collegabili solo repository pubbliche e non facenti parte di organization. Quindi l'obiettivo mio di avere una organization con dentro una repo per ogni stack, al momento non si può attuare)
- Verifica che le variabili d'ambiente su Vercel siano popolate correttamente

Step:
1. Git push
2. Aspettare che parta e finisca con successo il deploy
3. Aggiornare lo schema del DB, se necessario:
    - al momento tramite il comando `npx prisma db push` da lancaire quin su VSCode puntando, nel .env, al DB remoto Supabase
    - in futuro capire come integrare questo comando su Vercel nella fase di build