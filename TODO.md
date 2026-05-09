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
**Stato**: 🔴 TODO  
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

**BUG #2: Cart - Spelling error "0 prodottoi"**
- **File**: `app/shop/cart/page.tsx` (line ~110)
- **Problema**: Plurale sbagliato
- **Soluzione**: Fixare la logica di plurale `item.length !== 1 ? "i" : ""`
- **Priority**: 🟡 LOW (cosmetic)

**BUG #3: Cart - Permettere superamento inventario disponibile**
- **File**: `components/AddToCartForm.tsx`, `app/api/cart/route.ts`
- **Problema**: Aggiungere al carrello permette di superare quantity disponibile (es. 6 unità su 5 disponibili)
- **Soluzione**:
  - Fetch inventory quantity prima di aggiungere
  - Controllare: `requestedQty <= availableQty`
  - Se supera, mostrare errore: "Superata disponibilità del prodotto"
  - Anche al checkout: fare check finale prima di creare ordine
- **Priority**: 🔴 HIGH (data integrity)

**BUG #4: Checkout - CartItemsList non permette modifca**
- **File**: `app/shop/checkout/page.tsx`
- **Problema**: I bottoni rimuovi/modifica sono disabilitati (è intenzionale?)
- **Soluzione**: Valutare se permettere modifca durante checkout o se è corretto tenerli disabilitati
  - Se dev permettere: passare handler reali a CartItemsList
  - Se no: aggiungere nota "Per modificare il carrello, torna indietro"
- **Priority**: 🟡 MEDIUM (UX clarity)

**BUG #5: Checkout - Inventory non aggiornato se ordine > disponibile**
- **File**: `app/api/orders/route.ts` (POST handler)
- **Problema**: Se ordino 6 unità su 5 disponibili, l'ordine va a buon fine ma inventory non aggiornato
- **Root Cause**: Query `inventory.updateMany({ where: { quantity: { gte: item.quantity } } })` fallisce se quantity < item.quantity
- **Soluzione**: Aggiungere validazione PRIMA di creare ordine:
  - Loopare su cartItems
  - Per ogni item, controllare `inventory.quantity >= item.quantity`
  - Se non rispetta, throw error "Prodotto [name] non disponibile in quantità richiesta"
- **Priority**: 🔴 HIGH (critical bug)

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
1. **BUG #5**: Inventory check prima ordine (5h)
2. **BUG #3**: Validazione disponibilità al carrello (3h)
3. **BUG #1**: Redirect login con callback (2h)
4. **BUG #2**: Spelling fix (15min)
5. **BUG #4**: Review CartItemsList disabilitato (30min)

**Tempo totale**: ~10-11 ore

### PHASE 2: MIGLIORIE CORE 🟡
1. **MIGLIORAMENTO #1**: Admin Orders CRUD (8h)
2. **MIGLIORAMENTO #2**: Customer Orders Detail Modal (4h)

**Tempo totale**: ~12 ore

### PHASE 3: ADVANCED FEATURES 🟢
1. **MIGLIORAMENTO #3**: Reservation System (5h)
2. Email Notifications (SendGrid) (6h)
3. Payment Integration (Stripe) (8h)

**Tempo totale**: ~19 ore

---

## 📝 Nota Importante

**Stato Step 2**: ✅ Completato (Checkout flow implementato e testato)  
**Prossima priorità**: Iniziare PHASE 1 (Bug Fix Critico)  
**Timeline stimata PHASE 1**: 1-2 giorni (dipende dal carico)

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
