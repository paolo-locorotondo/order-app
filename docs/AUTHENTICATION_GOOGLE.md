# Autenticazione con Google - Order App

## Indice
1. [Architettura Autenticazione](#architettura-autenticazione)
2. [File Chiave del Progetto](#file-chiave-del-progetto)
3. [Flusso Dettagliato Step-by-Step](#flusso-dettagliato-step-by-step)
4. [Protezione delle Rotte](#protezione-delle-rotte)
5. [Variabili di Ambiente](#variabili-di-ambiente)
6. [Come Configurare Google OAuth](#come-configurare-google-oauth)

---

## Architettura Autenticazione

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUSSO AUTENTICAZIONE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Utente clicca "Accedi con Google"                       │
│         ↓                                                    │
│  2. Redirect a Google OAuth Consent Screen                  │
│         ↓                                                    │
│  3. Utente autorizza l'app Google                           │
│         ↓                                                    │
│  4. Redirect a /api/auth/callback/google con authCode       │
│         ↓                                                    │
│  5. NextAuth scambia authCode con Access Token/ID Token     │
│         ↓                                                    │
│  6. Crea utente in DB (se non esiste)                       │
│         ↓                                                    │
│  7. Genera JWT Session Token                                │
│         ↓                                                    │
│  8. User loggato su app                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## File Chiave del Progetto

### 1. `lib/auth.ts` - Configurazione NextAuth

**File**: `lib/auth.ts`

```typescript
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";

export const authOptions = {
  adapter: PrismaAdapter(prisma),  // Salva utenti in DB
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,  // Usa JWT per sessioni
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
  },
};

export default NextAuth(authOptions);
```

**Cosa fa**:
- **`PrismaAdapter`**: Integra NextAuth con il database Prisma
  - Salva automaticamente nuovi utenti
  - Gestisce account, sessioni, token di verifica
  
- **`GoogleProvider`**: Configura Google come provider OAuth 2.0
  - Usa `GOOGLE_CLIENT_ID` per identificare l'app
  - Usa `GOOGLE_CLIENT_SECRET` per autenticarsi con Google
  
- **`session: { strategy: "jwt" }`**: Usa JWT stateless
  - Niente sessioni memorizzate sul server
  - Token auto-firmato e verificabile
  
- **`callbacks.session`**: Personalizza dati in sessione
  - Aggiunge `id` e `role` dell'utente alla sessione
  - Accessibile da client-side con `useSession()`
  
- **`callbacks.jwt`**: Personalizza il JWT token
  - Aggiunge campi custom al token
  - Questi dati vengono inclusi nel cookie di sessione

---

### 2. `app/api/auth/[...nextauth]/route.ts` - Endpoint Auth

**File**: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

**Cosa fa**:
- Espone i comandi NextAuth come API routes
  - `/api/auth/signin` - Accedi
  - `/api/auth/callback/google` - Callback da Google
  - `/api/auth/signout` - Logout
  - `/api/auth/session` - Leggi sessione corrente
  - `/api/auth/providers` - Elenca provider disponibili
  
- Il pattern `[...nextauth]` cattura tutte le sotto-rotte auth
- È il "gateway" tra l'app e OpenID Connect di Google

---

### 3. `middleware.ts` - Protezione Rotte

**File**: `middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = ["/dashboard", "/api/orders", "/api/cart", "/api/products"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypassare rotte pubbliche
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Controllare se è una rotta protetta
  const isProtected = protectedRoutes.some((path) => pathname.startsWith(path));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Verificare JWT token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    // Reindirizzare a login
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/orders/:path*", "/api/cart/:path*"],
};
```

**Cosa fa**:
- Intercetta tutte le richieste alle rotte protette
- Verifica se l'utente ha un JWT valido (token)
  - `getToken()` legge il JWT dal cookie `__Secure-next-auth.session-token`
  - Lo verifica usando la firma (`NEXTAUTH_SECRET`)
  
- Se token assente o non valido:
  - Reindirizza a `/auth/login?callbackUrl=/protected-route`
  - Dopo login, l'utente torna alla pagina richiesta
  
- **`config.matcher`**: Specifica quali route controllare
  - Solo applicato a dashboard e API orders/cart

---

### 4. `types/next-auth.d.ts` - Estensione Tipi TypeScript

**File**: `types/next-auth.d.ts`

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "ADMIN" | "CUSTOMER";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "CUSTOMER";
  }
}
```

**Cosa fa**:
- **`declare module "next-auth"`**: Estende la sessione NextAuth
  - Aggiunge `id` e `role` ai campi default (email, name, image)
  - TypeScript sa che `session.user.id` e `session.user.role` esistono
  
- **`declare module "next-auth/jwt"`**: Estende il JWT token
  - Dichiara campi custom nel JWT firmato
  - Garantisce type-safety quando si accede al token

---

### 5. `components/Header.tsx` - Pulsante Login

**File**: `components/Header.tsx`

```typescript
"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
      <div className="text-lg font-bold">Order App</div>
      <nav className="flex items-center gap-4">
        <Link href="/">Home</Link>
        <Link href="/shop">Shop</Link>
        {session?.user ? <Link href="/dashboard">Dashboard</Link> : null}
        {status === "authenticated" ? (
          <>
            <span className="text-sm">Ciao, {session.user.name ?? session.user.email}</span>
            <button onClick={() => signOut()} className="btn-primary">
              Logout
            </button>
          </>
        ) : (
          <button onClick={() => signIn("google")} className="btn-primary">
            Accedi con Google
          </button>
        )}
      </nav>
    </header>
  );
}
```

**Cosa fa**:
- **`useSession()`**: Hook che legge la sessione corrente
  - Ritorna `{ data: session, status: "loading" | "authenticated" | "unauthenticated" }`
  - Il componente si re-rende quando cambia lo stato di autenticazione
  
- **`signIn("google")`**: Innesca il flusso di autenticazione Google
  - Reindirizza a Google OAuth Consent Screen
  - Dopo autorizzazione, reindirizza al callback
  
- **`signOut()`**: Logout
  - Elimina il JWT dal cookie
  - Reindirizza a homepage

---

## Flusso Dettagliato Step-by-Step

### Step 1: Utente Clicca "Accedi con Google"

```typescript
// Nel componente Header
<button onClick={() => signIn("google")}>
  Accedi con Google
</button>
```

NextAuth reindirizza a:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_GOOGLE_CLIENT_ID&
  redirect_uri=http://localhost:3000/api/auth/callback/google&
  response_type=code&
  scope=openid%20email%20profile&
  ...altri_parametri
```

**Parametri importanti**:
- `client_id`: Identifica la tua app presso Google
- `redirect_uri`: URL dove Google reindirizzerà dopo autorizzazione
- `scope`: Dati richiesti all'utente (email, profilo)
- `response_type=code`: Richiede un authorization code (non token)

---

### Step 2: Schermata di Consenso Google

L'utente vede:
```
┌──────────────────────────────────────┐
│  Order App vuole accedere a:         │
│                                      │
│  ☑ Nome e foto                       │
│  ☑ Email                             │
│  ☑ Profilo generale                  │
│                                      │
│  [Consenti]  [Rifiuta]              │
└──────────────────────────────────────┘
```

L'utente clicca "Consenti".

---

### Step 3: Callback da Google

Dopo l'autorizzazione, Google reindirizza a:
```
http://localhost:3000/api/auth/callback/google?code=4%2F0A...&state=...
```

**Parametri**:
- `code`: Authorization code (valido 10 minuti)
- `state`: Token di protezione CSRF (NextAuth lo verifica)

---

### Step 4: Scambio Code con Google

NextAuth (lato server) fa una richiesta HTTPS a Google:
```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
code=4%2F0A...
client_id=YOUR_GOOGLE_CLIENT_ID
client_secret=YOUR_GOOGLE_CLIENT_SECRET
redirect_uri=http://localhost:3000/api/auth/callback/google
```

Google risponde con:
```json
{
  "access_token": "ya29.a0AfH...",
  "expires_in": 3599,
  "refresh_token": "1//0gL...",
  "scope": "openid email profile",
  "token_type": "Bearer",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2N2M..."
}
```

---

### Step 5: Decoding ID Token

NextAuth decodifica l'`id_token` (è un JWT firmato da Google) e ottiene:
```json
{
  "iss": "https://accounts.google.com",
  "azp": "YOUR_GOOGLE_CLIENT_ID",
  "aud": "YOUR_GOOGLE_CLIENT_ID",
  "sub": "107091234567890123456",
  "email": "mario@gmail.com",
  "email_verified": true,
  "at_hash": "x5...",
  "name": "Mario Rossi",
  "picture": "https://lh3.googleusercontent.com/a/...",
  "given_name": "Mario",
  "family_name": "Rossi",
  "locale": "it",
  "iat": 1714754400,
  "exp": 1714758000
}
```

---

### Step 6: Salvataggio Utente in Database

PrismaAdapter automaticamente esegue (pseudo SQL):
```sql
-- Cerca utente per email
SELECT * FROM "User" WHERE email = 'mario@gmail.com';

-- Se non esiste, crea nuovo utente
INSERT INTO "User" 
  (id, email, name, image, role, emailVerified, createdAt, updatedAt)
VALUES 
  ('clid123...', 'mario@gmail.com', 'Mario Rossi', 'https://...', 'CUSTOMER', NOW(), NOW(), NOW());

-- Crea un account collegato per tracciare il provider Google
INSERT INTO "Account"
  (userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
VALUES
  ('clid123...', 'oauth', 'google', '107091234567890123456', '1//0gL...', 'ya29.a0AfH...', 1714758000, 'Bearer', 'openid email profile', 'eyJhbGc...', NULL);
```

**Cosa accade**:
- Se è il primo login con Google, crea un nuovo User
- Se l'email esiste già, aggiorna i dati (name, picture)
- Crea un "Account" per tracciare che questo User è collegato a Google
- `role` è sempre `CUSTOMER` di default (un admin lo può cambiare dopo)
- `emailVerified` è settato a NOW() (Google garantisce email verificate)

---

### Step 7: Creazione JWT Session Token

NextAuth genera un JWT con i dati dell'utente:

**Payload JWT**:
```json
{
  "sub": "clid123...",
  "name": "Mario Rossi",
  "email": "mario@gmail.com",
  "picture": "https://lh3.googleusercontent.com/...",
  "id": "clid123...",
  "role": "CUSTOMER",
  "iat": 1714754400,
  "exp": 1714845600,
  "jti": "xyz..."
}
```

**Firma**:
- Algoritmo: HS256 (HMAC-SHA256)
- Chiave: `NEXTAUTH_SECRET` - **DEVE essere unica e segreta!**

JWT finale (firmato):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiJjbGlkMTIzLi4uIiwibmFtZSI6Ik1hcmlvIFJvc3NpIiwiZW1haWwiOiJtYXJpb0BnbWFpbC5jb20iLCJpZCI6ImNsaWQxMjMuLi4iLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3MTQ3NTQ0MDAsImV4cCI6MTcxNDg0NTYwMH0.
HMAC_SHA256_SIGNATURE_HERE
```

---

### Step 8: Salvataggio Token nei Cookie

NextAuth imposta un cookie HTTP:

```http
Set-Cookie: __Secure-next-auth.session-token=eyJhbGc...; 
  Path=/; 
  HttpOnly; 
  Secure; 
  SameSite=Lax; 
  Max-Age=86400
```

**Caratteristiche di sicurezza**:
- **`HttpOnly`**: Il cookie non è accessibile da JavaScript
  - Protezione contro XSS (Cross-Site Scripting)
  - Se un attaccante inietta JS, non può leggere il token
  
- **`Secure`**: Il cookie è inviato solo su HTTPS
  - Protezione contro Man-in-the-Middle
  
- **`SameSite=Lax`**: Protezione contro CSRF (Cross-Site Request Forgery)
  - Il cookie è inviato nei redirects tra siti (lax)
  - Non è inviato in richieste cross-origin dirette (POST da altro sito)
  
- **`Max-Age=86400`**: Cookie valido per 24 ore
  - Dopo 24 ore, l'utente deve fare login di nuovo

---

### Step 9: Reindirizzamento e Sessione Attiva

Dopo aver impostato il cookie, NextAuth reindirizza a:
```
http://localhost:3000/ (o alla callbackUrl originale)
```

Ora l'utente è loggato! Ad ogni richiesta HTTP:
1. Il browser invia automaticamente il JWT cookie
2. Il server verifica il JWT usando `NEXTAUTH_SECRET`
3. Se valido, l'utente è autenticato

---

### Step 10: Accesso ai Dati di Sessione

Nel componente client:
```typescript
const { data: session } = useSession();

// session contiene:
{
  user: {
    email: "mario@gmail.com",
    name: "Mario Rossi",
    image: "https://lh3.googleusercontent.com/...",
    id: "clid123...",
    role: "CUSTOMER"
  }
}
```

Nel componente server:
```typescript
const session = await getServerSession(authOptions);

// Stesso contenuto, ma lato server
session.user.id      // "clid123..."
session.user.role    // "CUSTOMER"
```

---

## Protezione delle Rotte

### A. API Routes Protette

**File**: `app/api/cart/route.ts`

```typescript
import { getToken } from "next-auth/jwt";

export async function POST(request: NextRequest) {
  // Leggere il JWT dal cookie
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Se non c'è token, l'utente non è autenticato
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    );
  }

  // Utente autenticato - posso usare i dati
  const userId = token.id;      // ID dell'utente
  const userRole = token.role;  // ADMIN o CUSTOMER

  // Logica protetta...
  const cartItem = await prisma.cartItem.create({
    data: {
      userId,
      productId: body.productId,
      quantity: body.quantity,
    },
  });

  return NextResponse.json({ data: cartItem }, { status: 201 });
}
```

**Flusso**:
1. Client invia richiesta POST con JWT nel cookie
2. `getToken()` legge il cookie e lo verifica
3. Se firma non valida → `token` è null
4. Se token è null → ritorna 401 Unauthorized
5. Se token valido → posso accedere all'ID e role dell'utente

---

### B. Pagine Server Protette

**File**: `app/dashboard/page.tsx`

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Se non c'è sessione, l'utente non è loggato
  if (!session) {
    return <div>Non sei autenticato. <a href="/auth/login">Accedi</a></div>;
  }

  // Sessione valida - posso usare i dati
  const userId = session.user.id;
  const userRole = session.user.role;

  // Carico dati specifici dell'utente
  const orders = await prisma.order.findMany({
    where: { userId },
  });

  return (
    <div>
      <h1>Bentornato, {session.user.name}</h1>
      <p>Ruolo: {userRole}</p>
      {/* Mostra ordini */}
    </div>
  );
}
```

---

### C. Middleware Global

**File**: `middleware.ts`

```typescript
export const config = {
  matcher: ["/dashboard/:path*", "/api/orders/:path*"],
};

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    // Redirect non autenticati a login
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Prosegui verso la route protetta
  return NextResponse.next();
}
```

**Vantaggio**:
- Non devi controllare `if (!token)` in ogni API route o pagina
- Il middleware lo fa globalmente per tutti gli `/api/orders/**` e `/dashboard/**`

---

## Variabili di Ambiente

| Variabile | Dove usato | Cosa contiene | Sensibilità |
|-----------|-----------|---------------|------------|
| `GOOGLE_CLIENT_ID` | `lib/auth.ts` | ID app da Google Cloud Console | Pubblico (può essere visibile in HTML) |
| `GOOGLE_CLIENT_SECRET` | `lib/auth.ts` | Secret per OAuth con Google | **ULTRA-SENSIBILE** - Mai nei logs, mai nel git |
| `NEXTAUTH_SECRET` | Middleware, JWT signing | Chiave per firmare/verificare JWT | **ULTRA-SENSIBILE** - Genera con `openssl rand -base64 32` |
| `DATABASE_URL` | `lib/db.ts` | Stringa di connessione PostgreSQL | **ULTRA-SENSIBILE** - Contiene password |

---

## Come Configurare Google OAuth

### 1. Crea Progetto Google Cloud

1. Vai a [Google Cloud Console](https://console.cloud.google.com/)
2. Clicca "Seleziona un progetto" → "Nuovo progetto"
3. Nome: `Order App` (o quel che vuoi)
4. Click "Crea"

### 2. Abilita Google+ API

1. Nella barra di ricerca, scrivi "Google+ API"
2. Clicca su "Google+ API"
3. Clicca "Abilita"

### 3. Crea Credenziali OAuth

1. Nel menu sinistro, vai a "Credenziali"
2. Clicca "Crea credenziali" → "ID client OAuth"
3. Se richiesto, configura la "Schermata di consenso OAuth"
   - User type: "Esterno"
   - App name: "Order App"
   - User support email: il tuo email
   - Developer contact info: il tuo email
   - Click "Salva e continua"
   - Scopes: lascia di default (aggiungi `email`, `profile`)
   - Click "Salva e continua"

### 4. Crea ID Client

1. Application type: "Web application"
2. Name: "Order App - Local" (o il nome che vuoi)
3. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:3000/` (con slash)
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
5. Click "Crea"

### 5. Copia le Credenziali

Una popup mostra:
- **Client ID**: `123456789-abcdef.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abc123...`

### 6. Salva nel `.env`

```env
GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123..."
```

### 7. Genera NEXTAUTH_SECRET

```bash
openssl rand -base64 32
# Esempio output: "kR5nK2pL8qM9wX7vZ3bJ1hF6gT4eP2cX="
```

Aggiungi al `.env`:
```env
NEXTAUTH_SECRET="kR5nK2pL8qM9wX7vZ3bJ1hF6gT4eP2cX="
```

### 8. Test Locale

1. Avvia l'app: `npm run dev`
2. Vai a `http://localhost:3000`
3. Clicca "Accedi con Google"
4. Dovrebbe funzionare!

---

## Troubleshooting

### Errore: "The OAuth client was not found"

**Causa**: ID client non configurato o errato.

**Soluzione**:
- Verifica che `GOOGLE_CLIENT_ID` sia nel `.env`
- Copia da Google Cloud Console (non modificare)

---

### Errore: "Redirect URI mismatch"

**Causa**: La redirect URI in Google Cloud non combacia con quella dell'app.

**Soluzione**:
- In Google Cloud Console → Credenziali → Modifica ID client
- Aggiungi: `http://localhost:3000/api/auth/callback/google`
- Per produzione, aggiungi: `https://yourdomain.com/api/auth/callback/google`

---

### Errore: "NEXTAUTH_SECRET non è configurato"

**Causa**: `NEXTAUTH_SECRET` mancante nel `.env`.

**Soluzione**:
```bash
openssl rand -base64 32
# Copia l'output nel .env come NEXTAUTH_SECRET=...
```

---

### Errore: "InvalidCredential: The provided email is not a valid Google account"

**Causa**: Stai usando un account non-Google nella schermata di accesso.

**Soluzione**:
- Usa un Google Account reale (gmail.com, o account aziendale Google Workspace)

---

## Sicurezza - Checklist

## Sicurezza - Checklist

- [ ] `NEXTAUTH_SECRET` è generato con `openssl rand -base64 32`
- [ ] `GOOGLE_CLIENT_SECRET` NON è in Git (`.gitignore` lo copre)
- [ ] Il `.env` contiene credenziali reali
- [ ] La redirect URI in Google Cloud matcha il tuo sito
- [ ] In produzione, usa HTTPS (Google non accetta HTTP per siti pubblici)
- [ ] Cambia `NEXTAUTH_SECRET` per ogni ambiente (dev ≠ prod)
- [ ] Usa variabili d'ambiente del provider (Vercel, Railway, etc.) in produzione
- [ ] **Header di sicurezza configurati**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, CSP, HSTS
- [ ] **Validazione password robusta**: minimo 8 caratteri, maiuscola, minuscola, numero, carattere speciale
- [ ] **Dati di test sicuri**: password seeding rispettano policy sicurezza (non usare "admin123", "test123")
- [ ] **Gestione errori sicura**: nessun leak di informazioni sensibili nei messaggi di errore
- [ ] **Input sanitization**: tutti gli input validati con Zod schemas prima dell'elaborazione

---

## Conclusione

L'autenticazione Google in Order App funziona così:
1. **NextAuth** gestisce il flusso OAuth di Google
2. **Prisma Adapter** salva automaticamente gli utenti in PostgreSQL
3. **JWT Token** mantiene le sessioni stateless (no server-side memory)
4. **Middleware** protegge le rotte richiedendo un token valido
5. **Type-safe** grazie alla dichiarazione dei tipi NextAuth estesa
6. **Sicurezza avanzata** con header HTTP, validazione input e password robuste

**Funzionalità di sicurezza implementate:**
- Header di sicurezza completi (XSS, CSRF, clickjacking protection)
- Content Security Policy (CSP) per prevenzione injection
- Strict Transport Security (HSTS) per forzare HTTPS
- Validazione input runtime con Zod schemas
- Password policy robuste (8+ caratteri, caratteri misti)
- Gestione errori sicura senza information disclosure
- Dati di test che rispettano le policy di sicurezza

Per produzione:
- Configura reindirizzamenti HTTPS
- Usa credenziali ambiente del tuo provider di deploy
- Monitora i log di autenticazione
- Esegui regolarmente security audit
- Mantieni aggiornate le dipendenze di sicurezza

---

**Documento generato per Order App - Guida Autenticazione Google**

Data: Aprile 2026
Versione: 1.0
