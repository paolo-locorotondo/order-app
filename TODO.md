# Order App - TODO List

## 📋 Recap Contesto

**Progetto**: Next.js Order Management App  
**Stack**: Next.js 14 + PostgreSQL (Supabase) + Prisma + NextAuth (Google OAuth)  
**Hosting**: Vercel (live in preview mode) + Supabase (database)

### Status Deployment ✅
- **Vercel**: App live e funzionante
- **Supabase**: Database PostgreSQL configurato e connesso
- **OAuth Google**: ✅ Configurato correttamente
  - Variabili d'ambiente settate su Vercel (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET)
  - Redirect URI configurato: `https://[vercel-domain].vercel.app/api/auth/callback/google`

### Features Attuali ✅
- Autenticazione Google con NextAuth
- Dashboard Admin (view-only per ora)
- Sistema ordini base
- Carrello funzionante
- Database seeding con dati di test

### Credenziali Test
- Admin: `admin@example.com` / `AdminSecure123!`
- User: `test@example.com` / `TestSecure456!`

---

## 🚀 Next Steps

### 1. Gestione Pagina Admin Prodotti (CRUD)
**Stato**: 🔴 TODO  
**Descrizione**: La pagina `/dashboard/admin/products` attualmente mostra solo i prodotti ma manca la gestione completa (Create, Read, Update, Delete)

**Task**:
- [ ] Implementare form di creazione prodotto
- [ ] Implementare modal/form di edit prodotto
- [ ] Implementare delete prodotto con conferma
- [ ] Aggiornare inventario da questa pagina
- [ ] Validazione form client + server
- [ ] Feedback visivo (toast/notifiche) per azioni

**File coinvolti**:
- `app/dashboard/admin/products/page.tsx`
- `app/api/admin/products/route.ts` (POST, PUT, DELETE)
- Possibile nuovo component: `components/ProductForm.tsx`

---

### 2. Gestione Checkout Carrello → Ordini
**Stato**: 🔴 TODO  
**Descrizione**: Implementare il flusso completo di checkout del carrello e creazione ordini

**Task**:
- [ ] Creare pagina checkout (`app/shop/checkout/page.tsx`)
- [ ] Form indirizzo spedizione + metodo pagamento
- [ ] Validazione dati ordine
- [ ] Creazione ordine nel database
- [ ] Svuotamento carrello post-ordine
- [ ] Pagina di conferma ordine con numero ordine
- [ ] Email di conferma ordine (SendGrid)
- [ ] Aggiornamento inventario dopo ordine

**File coinvolti**:
- `app/shop/checkout/page.tsx` (new)
- `app/api/orders/route.ts` (POST endpoint)
- `components/CheckoutForm.tsx` (new)
- `lib/validators.ts` (aggiungere validazioni checkout)

---

### 3. Email Notifications (SendGrid)
**Stato**: 🔴 TODO  
**Descrizione**: Implementare invio email automatiche (conferme ordini, notifiche, etc.)

**Task**:
- [ ] Configurare SendGrid API key su Vercel
- [ ] Creare template email per conferma ordine
- [ ] Creare endpoint per inviare email post-ordine
- [ ] Aggiungere email di benvenuto post-registrazione
- [ ] Aggiungere email di notifica admin per nuovi ordini
- [ ] Gestione errori invio email
- [ ] Testing email in locale

**File coinvolti**:
- `lib/email.ts` (new - utility per SendGrid)
- `app/api/orders/route.ts` (trigger email post-creazione)
- `app/api/auth/register/route.ts` (email benvenuto)

---

## 📝 Note

- La preview mode su Vercel è adeguata per testing
- Verificare le env var su Vercel prima di ogni deployment
- Testare sempre il flusso completo localmente prima di pushare
