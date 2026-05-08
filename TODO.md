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
**Stato**: ✅ COMPLETATO  
**Descrizione**: Gestione completa dei prodotti con create, read, update, delete

**Task completati**:
- [x] Implementare form di creazione prodotto con validazione client
- [x] Implementare modal/form di modifica prodotto
- [x] Implementare delete prodotto con conferma 2-step
- [x] Creare inventory insieme al prodotto durante CREATE
- [x] Aggiornare inventory tramite endpoint separato durante UPDATE
- [x] Validazione form client-side e server-side
- [x] Feedback visivo: loading state durante azioni
- [x] Auto-generazione slug dal nome prodotto
- [x] Validazione SKU univoco (controlla duplicati)
- [x] Gestione errori e messaggi user-friendly

**File creati/modificati**:
- `components/ProductForm.tsx` (NEW) - Form riutilizzabile con validazione
- `components/ProductDialog.tsx` (NEW) - Modal per create/edit
- `app/api/inventory/[id]/route.ts` (NEW) - Endpoint PUT per aggiornare stock
- `app/api/products/route.ts` (UPDATED) - POST con quantity nel body, validazione SKU
- `app/api/products/[id]/route.ts` (UPDATED) - PUT con SKU handling, DELETE con cascading
- `app/dashboard/admin/products/page.tsx` (UPDATED) - Client component con tabella CRUD

**Bug fix implementati**:
- ✅ Quantity: POST endpoint ora accetta e usa quantity dal body
- ✅ SKU duplicati: Validazione pre-check + errore 400 user-friendly
- ✅ SKU NULL: Stringa vuota convertita a NULL per evitare unique constraint
- ✅ DELETE cascading: Elimina CartItem + OrderItem + Inventory prima del Product

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
- ✅ DELETE Fix: eliminare Inventory prima del Product per evitare foreign key constraint

## 🎉 Completion Status

**Step 1 - Admin Prodotti CRUD**: ✅ COMPLETATO
- CREATE: ✅ Funzionante
- READ: ✅ Funzionante
- UPDATE: ✅ Funzionante (incluso aggiornamento inventario)
- DELETE: ✅ Fixato (cascading constraint risolto)

**Prossimi Step**:
- Step 2: Gestione Checkout Carrello → Ordini (in TODO)
- Step 3: Email Notifications (SendGrid) (in TODO)
