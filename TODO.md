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
**Stato**: ✅ COMPLETATO  
**Descrizione**: Implementare il flusso completo di checkout del carrello e creazione ordini

**Task completati**:
- [x] Creare pagina checkout (`app/shop/checkout/page.tsx`)
- [x] Form indirizzo spedizione + metodo pagamento
- [x] Validazione dati ordine (address min 10 char, paymentMethod enum)
- [x] Creazione ordine nel database con OrderItems
- [x] Svuotamento carrello post-ordine
- [x] Pagina di conferma ordine con numero ordine (`app/shop/order-confirmation/[id]/page.tsx`)
- [x] Aggiornamento inventario dopo ordine (decrement quantity)
- [x] Aggiungere checkout button in cart page

**File creati/modificati**:
- `components/CheckoutForm.tsx` (NEW) - Form con indirizzo + metodo pagamento
- `app/shop/checkout/page.tsx` (NEW) - Pagina checkout con layout 2 colonne
- `app/shop/order-confirmation/[id]/page.tsx` (NEW) - Pagina conferma con dettagli ordine
- `prisma/schema.prisma` (UPDATED) - Aggiunto address, paymentMethod a Order
- `app/api/orders/route.ts` (UPDATED) - POST con address/paymentMethod, inventory update
- `app/shop/cart/page.tsx` (UPDATED) - Aggiunto checkout button

---

### 2B. Bug Fix & Improvements da TEST_REPORT
**Stato**: ✅ COMPLETATO  
**Descrizione**: Fix dei bug riscontrati e implementazione delle migliorie suggerite

#### BUG:

**BUG #1: Shop - "Aggiungi al carrello" dovrebbe reindirizzare a login**
- **File**: `components/AddToCartForm.tsx`
- **Problema**: Se non autenticato, il click non ha effetto ma mostra messaggio "aggiunto"
- **Soluzione**: 
  - Controllare sesione con useSession()
  - Se non autenticato, redirect a `/auth/login?callbackUrl=/shop/products/[id]`
  - Usare `useRouter.push()` per redirect con callback
- **Priority**: 🔴 HIGH (user experience)
- **Stato**: ✅ COMPLETATO 

**BUG #2: Cart - Spelling error "0 prodottoi"**
- **File**: `app/shop/cart/page.tsx` (line ~112)
- **Problema**: Plurale sbagliato
- **Soluzione**: Fixare la logica di plurale `item.length !== 1 ? "i" : ""` (logica plurale correta: prodott{items.length !== 1 ? "i" : "o"}) 
- **Priority**: 🟡 LOW (cosmetic)
- **Stato**: ✅ COMPLETATO

**BUG #3: Cart - Permettere superamento inventario disponibile**
- **File**: `components/AddToCartForm.tsx`, `app/api/cart/route.ts`
- **Problema**: Aggiungere al carrello permette di superare quantity disponibile (es. 6 unità su 5 disponibili)
- **Soluzione**:
  - Fetch inventory quantity prima di aggiungere
  - Controllare: `requestedQty <= availableQty`
  - Se supera, mostrare errore: "Superata disponibilità del prodotto"
  - Anche al checkout: fare check finale prima di creare ordine
- **Priority**: 🔴 HIGH (data integrity)
- **Stato**: ✅ COMPLETATO 

**BUG #4: Checkout - CartItemsList non permette modifca**
- **File**: `app/shop/checkout/page.tsx`
- **Problema**: I bottoni rimuovi/modifica sono disabilitati (è intenzionale?)
- **Soluzione**: Valutare se permettere modifca durante checkout o se è corretto tenerli disabilitati
  - Se dev permettere: passare handler reali a CartItemsList
  - Se no: aggiungere nota "Per modificare il carrello, torna indietro"
- **Priority**: 🟡 MEDIUM (UX clarity)
- **Stato**: ✅ COMPLETATO (è intenzionale lasciare non editabili)

**BUG #5: Checkout - Inventory non aggiornato se ordine > disponibile**
- **File**: `app/api/orders/route.ts` (POST handler)
- **Problema**: Se ordino 6 unità su 5 disponibili, l'ordine va a buon fine ma inventory non aggiornato
- **Root Cause**: Query `inventory.updateMany({ where: { quantity: { gte: item.quantity } } })` fallisce se quantity < item.quantity
- **Soluzione**: Aggiungere validazione PRIMA di creare ordine:
  - Loopare su cartItems
  - Per ogni item, controllare `inventory.quantity >= item.quantity`
  - Se non rispetta, throw error "Prodotto [name] non disponibile in quantità richiesta"
- **Priority**: 🔴 HIGH (critical bug)
- **Stato**: ✅ COMPLETATO

**BUG #5b: Pagina dettaglio prodotto - Tasto "Aggiungi al carrello" non ha loading state**
- **File**: `app/shop/products/[id]/page.tsx`, `components/AddToCartForm.tsx`
- **Problema**: Il tasto "Aggiungi al carrello" nella pagina di dettaglio prodotto non ha feedback durante l'operazione (non si disabilita, non mostra loading)
- **Soluzione**:
  - Aggiungere stato `loading` mentre fetch è in corso
  - Disabilitare tasto durante `loading: true`
  - Mostrare spinner o testo "Aggiungendo..." durante operazione
  - Solo dopo callback success, riabilitare e mostrare "Prodotto aggiunto"
- **Priority**: 🟡 MEDIUM (UX consistency)
- **Stato**: ✅ COMPLETATO

#### MIGLIORIE:

**MIGLIORAMENTO #1: Admin Orders Dashboard**
- **File**: Creare `app/dashboard/admin/orders/page.tsx`
- **Descrizione**: Pagina CRUD per admin per gestire ordini
- **Features**:
  - Tabella ordini (id, user, total, status, date)
  - Filtri: status (PENDING, PAID, SHIPPED, DELIVERED, CANCELLED)
  - Azioni:
    - **Visualizza dettagli**: Modal con tutti i dati ordine
    - **Annulla ordine**: DELETE + restore inventory per ogni OrderItem
    - **Modifica ordine**: Form per cambiare status, paymentMethod, address
    - **Crea ordine**: Form per admin per creare ordine per conto di altro utente
- **API Endpoints**:
  - `PUT /api/orders/[id]` - Aggiorna order (status, paymentMethod, address)
  - `DELETE /api/orders/[id]` - Cancella order + restore inventory
  - `POST /api/orders?adminMode=true` - Crea ordine per conto di altro user (admin only)
- **Priority**: 🟡 MEDIUM
- **Stato**: 🔴 TODO 

**MIGLIORAMENTO #2: Customer Orders History**
- **File**: Aggiornare `app/dashboard/orders/page.tsx`
- **Descrizione**: Aggiungere la possibilità di visualizzare dettaglio ordine
- **Features**:
  - Lista ordini (già c'è)
  - Click su ordine → mostra modal con:
    - Numero ordine, data, status
    - Indirizzo spedizione
    - Lista articoli con prezzi
    - Totale
  - Bottone "Scarica fattura" (placeholder per Step 3)
- **Priority**: 🟡 MEDIUM
- **Stato**: 🔴 TODO 

**MIGLIORAMENTO #3: Product Reservation System (Advanced)**
- **File**: `app/shop/checkout/page.tsx`, `app/api/orders/route.ts`
- **Descrizione**: Durante checkout, "riservare" i prodotti per 5 minuti. Se timer scade, liberarli e uscire.
- **Implementazione**:
  - Aggiungere campo `reserved` a Inventory (già esiste!)
  - OnCheckoutPageLoad: incrementare `reserved` per ogni cartItem
  - UseEffect con timer: dopo 5 min, decrementare `reserved` e redirect a `/shop/cart` con messaggio "Sessione checkout scaduta"
  - OnOrderSuccess: `reserved` diventa parte di `quantity` decrement
  - OnOrderCancel: riportare `reserved` a zero
- **Priority**: 🟢 LOW (nice to have, advanced feature)
- **Stato**: 🔴 TODO

**MIGLIORAMENTO #4: Redesign Admin Products Page (UI Consistency)**
- **File**: `app/dashboard/admin/products/page.tsx`
- **Descrizione**: Renderla graficamente simile a `/dashboard/admin/users`, con form inline invece di modal
- **Implementazione**:
  - Rimuovere componente `ProductDialog` (modal)
  - Aggiungere form inline in fondo alla pagina (come `/admin/users`)
  - Form appare quando click "Nuovi Prodotto" o click "Modifica" su un prodotto
  - Tasto "Nuovo Prodotto" sostituito con tab/link a "Gestione Utenti" e "Gestione Inventario"
  - Stesso layout: tabella destra, form sinistra (o sopra)
- **Priority**: 🟡 MEDIUM (refactor estetico)
- **Stato**: ✅ COMPLETATO

**MIGLIORAMENTO #5: Unify Navigation (Home → Dashboard)**
- **File**: `app/page.tsx`, `app/dashboard/page.tsx`
- **Descrizione**: Home page dovrebbe mostrare stessi tasti della dashboard (i tasti variano solo per admin vs customer)
- **Soluzioni possibili**:
  - **Opzione A**: Unire le due pagine - Home reindirizza a `/dashboard`
  - **Opzione B**: Home con tab/link diretto a dashboard
  - **Opzione C**: Home mostra i tasti direttamente (Miei Ordini, Carrello, Prodotti) e aggiunge link "Dashboard Admin" se ADMIN
- **Nota**: Da decidere con user quale preferisce
- **Priority**: 🟡 MEDIUM (UX improvement)
- **Stato**: 🔴 TODO (in planning)

**MIGLIORAMENTO #6: Products with Delivery Date & Dynamic Pricing**
- **File**: `prisma/schema.prisma`, `app/api/products/route.ts`, `components/ProductForm.tsx`
- **Descrizione**: Un prodotto può avere varianti con date di consegna diverse e prezzi diversi
- **Opzione scelta**: Modificare unique constraint: da `unique: slug` a `@@unique([slug, sku])`
  - Permette di avere: Prodotto "X" con SKU "X-2026_05_12" a €10 e "X-2026_05_22" a €8
  - Aggiungere campo `deliveryDate` a Product (o a Inventory?)
  - UI: mostrare data consegna accanto al prezzo
  - Filtro shop: permette filtrare per data consegna
- **Priority**: 🟢 MEDIUM (feature request, richiede schema change)
- **Stato**: ✅ COMPLETATO

**MIGLIORAMENTO #7: Gestione paymentMethod come Enum**
- **File**: `prisma\schema.prisma`
- **Descrizione**: Usare una Enum per il paymentMethod ed usare questa enum generata da prisma in tutta l'applicazione.
- **Implementazione**:
  - Usare enum PaymentMethods invece di String come tipo del campo paymentMethod
      enum PaymentMethods { 
        CASH
        PAYPAL
        STRIPE
      }
- **Priority**: 🟢 LOW (nice to have, advanced feature)
- **Stato**: 🔴 TODO

**MIGLIORAMENTO #8: svuota form in Admin - Utenti come in Admin - Prodotti**
- **File**: `prisma\schema.prisma`
- **Descrizione**: Nella pagina di gestione prodotti, quando si modifica un prodotto, al termine della chiamata back end, se l'esito è positivo, viene svuotato il form che torna a quello di crea Nuovo Prodotto. Bisogna replicare questo comportamento anche nella pagina di gestione utenti.
- **Implementazione**: da definire
- **Priority**: 🟢 LOW (nice to have, advanced feature)
- **Stato**: 🔴 TODO

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

### 4. Payment Integration (Stripe)
**Stato**: 🔴 TODO  
**Descrizione**: Implementare pagamenti tramite Stripe

**Task**:
- [ ] Configurare Stripe API keys (public + secret)
- [ ] Creare webhook Stripe per payment events
- [ ] Implementare Stripe Checkout Session
- [ ] Aggiornare Order status in base a pagamento
- [ ] Refund handling
- [ ] Testing con Stripe test cards

---

### 5. Reports & Analytics (Dashboard Admin)
**Stato**: 🔴 TODO  
**Descrizione**: Aggiungere report e analytics per admin

**Task**:
- [ ] Dashboard con statistiche: sales, orders, revenue
- [ ] Grafici ordini per mese/settimana
- [ ] Esportazione report (CSV/PDF)
- [ ] Analisi inventory: prodotti in stock, low stock alerts

---

## 📊 Piano di Implementazione (Priorità)

### PHASE 1: BUG FIX CRITICO 🔴
1. **BUG #5**: ✅ Inventory check prima ordine (COMPLETATO)
2. **BUG #3**: ✅ Validazione disponibilità al carrello (COMPLETATO)
3. **BUG #1**: ✅ Redirect login con callback (COMPLETATO)
4. **BUG #5b**: ✅ Loading state su tasto "Aggiungi al carrello" (COMPLETATO)
5. **BUG #2**: ✅ Spelling fix "prodottoi" → "prodotti" (COMPLETATO)
6. **BUG #4**: ✅ Review CartItemsList disabilitato (COMPLETATO - intenzionale durante checkout)

**Tempo totale**: ~7-8 ore | **Completati**: 6/6 (100%) ✅

### PHASE 2: MIGLIORIE CORE 🟡
1. **MIGLIORAMENTO #2**: Customer Orders Detail Modal (4h)
2. **MIGLIORAMENTO #1**: Admin Orders CRUD (8h)
3. **MIGLIORAMENTO #4**: ✅ Redesign Admin Products Page (COMPLETATO)
4. **MIGLIORAMENTO #5**: Navigation Unification (2h)

**Tempo totale**: ~17 ore

### PHASE 3: ADVANCED FEATURES 🟢
1. **MIGLIORAMENTO #3**: Reservation System (5h)
2. **MIGLIORAMENTO #6**: Products with Delivery Date (schema rework - 6h)
3. Email Notifications (SendGrid) (6h)
4. Payment Integration (Stripe) (8h)

**Tempo totale**: ~25 ore

---

## 📝 Domande & Risposte

### Domande Risolte:
1. ✅ **reorderPoint** - Livello minimo di stock per riordini automatici
2. ✅ **stripePaymentId** - ID transazione Stripe per tracking pagamenti
3. ✅ **DATABASE_URL vs DIRECT_URL** - Perché due?
   - `DATABASE_URL`: Connection string con connection pooling (Prisma Accelerate o PgBouncer), usata per query normali da web
   - `DIRECT_URL`: Connection diretta al database, usata per migrazioni, seed script, bulk operations
   - In Supabase: DATABASE_URL usa il pool di connessioni, DIRECT_URL va direttamente al DB
   - Si potrebbero unire se non usi connection pooling, ma è meglio mantenerle separate per scalabilità

---

## 📝 Nota Importante

**Stato Step 2**: ✅ Completato (Checkout flow implementato e testato)  
**Stato Step 2B (Bug Fix)**: ✅ COMPLETATO (6/6 bug risolti - 100%)  
**Prossima priorità**: PHASE 2 - Miglioramenti Core (Customer Orders Detail, Admin Orders CRUD)  
**Timeline stimata PHASE 2**: 2-3 giorni

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
