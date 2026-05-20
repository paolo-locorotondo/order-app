# Order App - TODO List

## 📋 Recap Contesto

**Progetto**: Next.js Order Management App  
**Stack**: Next.js 14 + PostgreSQL (Supabase) + Prisma + NextAuth (Google OAuth)  
**Hosting**: Vercel (live in preview mode e/o production mode) + Supabase (database)

### Status Deployment ✅
- **Vercel**: App live e funzionante
- **Supabase**: Database PostgreSQL configurato e connesso
- **OAuth Google**: ✅ Configurato correttamente
  - Variabili d'ambiente settate su Vercel (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET)
  - Redirect URI configurato: `https://[vercel-domain].vercel.app/api/auth/callback/google`

### Features Attuali ✅
- Autenticazione Google con NextAuth
- Database seeding con dati di test
- Shop: elenco di prodotti da poter aggiungere al carrello
- Carrello: lista di prodotti da poter aggiungere all'ordine durante il checkout
- Dashboard:
  - Lista ordini effettuati
- Dashboard Admin:
  - Admin Utenti: CRUD
  - Admin Prodotti: CRUD
  - Admin Inventario: per ora solo visualizza dati inventario (TODO CRUD?)
  - Admin Ordini: CRUD, in particolare creazione di un ordine per conto di altro utente

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

### 3. Admin Orders Dashboard
**Stato**: ✅ COMPLETATO  
**Descrizione**: Pagina CRUD per admin per gestire ordini

**Task**:
- [X] Tabella con lista degli ordini filtrabile per stato ordine
- [X] Modifica ordine (Per ora si può aggiornare solo lo stato)
- [X] Elimina ordine + restore inventory per ogni OrderItem
- [X] Crea ordine per conto di altro utente + update inventory per ogni OrderItem

---

### 4. Customer Orders History
**Stato**: 🔴 TODO  
**Descrizione**: Aggiungere la possibilità di visualizzare dettaglio ordine
**File**: Aggiornare `app/dashboard/orders/page.tsx`
**Features**:
  - Lista ordini già c'è, ma la refattorizzarei in tabella filtrabile per stato, prodotto e ordinabile per data
  - Click su "Dettaglio" → mostra modal con:
    - Numero ordine, data, status
    - Indirizzo spedizione
    - Lista articoli con prezzi
    - Totale
- **Priority**: 🟡 MEDIUM
- **Stato**: 🔴 TODO 

---

### 4. Product Reservation System
**Stato**: ✅ COMPLETATO
**Descrizione**: Durante checkout, "riservare" i prodotti per 5 minuti. Se timer scade, liberarli e uscire.

**Task completati**:
- [X] Aggiungere campo `reserved` a Inventory
- [X] Aggiungere model `CartReservation` + `CartReservationItem` (server come fonte di verità)
- [X] OnCheckoutPageLoad: GET reservation esistente o POST per crearne una (idempotente)
- [X] UseEffect con timer: alla scadenza, decrementare `reserved` e redirect a `/shop/cart?expired=true`
- [X] OnOrderSuccess: `quantity` e `reserved` decrementati, `CartReservation` cancellata
- [X] OnOrderCancel ("Torna al carrello"): release reservation con quantità salvate sul server
- [X] Cart in pagina checkout ora `readOnly` (nessun bottone Rimuovi/quantity per evitare modifiche durante checkout)
- [X] Test E2E manuali: happy path, reload, torna al carrello, scadenza timer, stato sporco, multi-prodotto, Strict Mode

**Architettura adottata**: server-authoritative reservations
- Model `CartReservation` con `@unique(userId)` garantisce 1 sola reservation attiva per utente
- Endpoint `/api/cart/reserve` GET (recupera) + POST (idempotente)
- Endpoint `/api/cart/release` decrementa con le quantità salvate (non quelle del cart corrente)
- Endpoint `/api/orders` consuma la reservation atomicamente (decrement quantity+reserved, cancel reservation, clear cart)
- Client senza `sessionStorage` (era fragile): server come unica fonte di verità

**Bug originali risolti**:
- ✅ Doppio increment di `reserved` per React 18 Strict Mode (`useEffect` × 2): risolto con `useRef` + unique constraint server
- ✅ Reload checkout non incrementa più `reserved` (server riconosce reservation esistente, restituisce stesso `expiresAt`)
- ✅ Race condition concorrenti: gestita con catch su unique constraint che ritorna la reservation creata dal vincitore
- ✅ `releaseCart` non scoordinato col cart: ora usa quantità della reservation
- ✅ `/api/orders` non rivalida più `reserved` globale: consuma direttamente la reservation dell'utente
- ✅ Rimosso `sessionStorage` come fonte di verità

**File creati/modificati**:
- `prisma/schema.prisma` — aggiunti modelli `CartReservation`, `CartReservationItem`
- `prisma/migrations/20260522141723_add_cart_reservation/` — migration
- `lib/reservation.ts` (NEW) — helper `releaseReservation` riutilizzabile
- `app/api/cart/reserve/route.ts` — riscritto: GET (recupera) + POST (idempotente)
- `app/api/cart/release/route.ts` — semplificato: usa `releaseReservation`
- `app/api/orders/route.ts` — consuma `CartReservation` invece di rivalidare
- `app/shop/checkout/CheckoutClient.tsx` — rimosso sessionStorage, server-driven, `useRef` per Strict Mode
- `app/shop/cart/page.tsx` — `searchParams` Promise (Next 16) + messaggio scadenza migliorato
- `components/CartItemsList.tsx` — aggiunta prop `readOnly`
- `scripts/reset-reservations.ts` (NEW) — utility reset DB
- `scripts/verify-reservation.ts` (NEW) — script E2E HTTP verifier

**Possibili miglioramenti futuri (non bloccanti)**:
- [ ] Endpoint admin `POST /api/admin/inventory/reconcile` per ricalcolare `Inventory.reserved` dalla somma delle `CartReservationItem` non scadute (utile in caso di drift dovuto a manipolazione manuale del DB)
- [ ] Cron job per cleanup di `CartReservation` scadute (al momento il cleanup è lazy: avviene su prossima GET/POST reserve dell'utente stesso)
- [ ] Advisory lock / `SELECT FOR UPDATE` su Inventory per concorrenza estrema cross-user (ora basta unique constraint per-user)

---

### 5. Email Notifications (SendGrid)
**Stato**: 🔴 TODO  
**Descrizione**: Implementare invio email automatiche (conferme ordini, notifiche, etc.)

**Task**:
- [ ] Spiegare cosa è SendGrid e metterlo a confronto con le altre opzioni
- [ ] Configurare SendGrid API key su Vercel
- [ ] Creare template email da poter riusare?
- [ ] Creare endpoint per inviare email post-ordine
- [ ] Aggiungere email di benvenuto post-registrazione e gestire la conferma dell'utente aggiornando poi la colonna emailVerified della tabella User
- [ ] Aggiungere email di notifica admin per nuovi ordini
- [ ] Gestione errori invio email
- [ ] Testing email in locale

**File coinvolti**:
- `lib/email.ts` (new - utility per SendGrid)
- `app/api/auth/register/route.ts` (email benvenuto)
- `app/api/orders/route.ts` (trigger email post-creazione)

---

### 6. Payment Integration (Stripe)
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

### 7. Reports & Analytics (Dashboard Admin)
**Stato**: 🔴 TODO  
**Descrizione**: Aggiungere report e analytics per admin

**Task**:
- [ ] Dashboard con statistiche: sales, orders, revenue
- [ ] Grafici ordini per mese/settimana
- [ ] Esportazione report (CSV/PDF)
- [ ] Analisi inventory: prodotti in stock, low stock alerts

---

## Bug Fix & Improvements

### **BUG 1**: Ordine con due prodotti uguali la somma delle quantità deve essere controllata per verifica disponibilità
- **Descrizione**: Nella pagina "Gestione - Ordini" nel form di creazione ordine, supponendo che in inventory il prodotto X ha disponibilità 10, quando aggiungo un prodotto X con quantità 5 e poi clicco "Aggiungi prodotto" e aggiungo sempre il prodotto X ma con quantità 6, l'ordine va a buon fine, invece avrebbe dovuto dare errore "Superata disponibilità del prodotto. Disponibili: 10, richieste: 11"
- **File**: `app/api/admin/orders/route.ts` (la validazione era client+server item-per-item, non aggregata per productId)
- **Fix**: aggregazione delle quantità per `productId` prima della validazione + decrement; tutto wrappato in transazione `prisma.$transaction` per atomicità
- **Priority**: 🔴 HIGH (inconsistenza dati)
- **Stato**: ✅ COMPLETATO

### **MIGLIORAMENTO #7**: Gestione paymentMethod come Enum
- **File**: `prisma\schema.prisma`
- **Descrizione**: Usare una Enum per il paymentMethod ed usare questa enum generata da prisma in tutta l'applicazione.
- **Implementazione**:
  ✅ COMPLETATO - Usare enum PaymentMethods invece di String come tipo del campo paymentMethod
      enum PaymentMethods { 
        CASH
        PAYPAL
        STRIPE
      }
  ✅ COMPLETATO - refactor: tutti i valori hardcoded relativi alle enum prisma, sostituire con queste enum
- **Priority**: 🟢 LOW (nice to have, advanced feature)
- **Stato**: ✅ COMPLETATO

### **MIGLIORAMENTO #8**: Conformare struttura delle pagine Admin
- **Descrizione**: Le pagine Admin hanno una tabella con una lista di record ed accanto un form di dettagio del record che permette di modificare il record selezionato. Se invece non è selezionato nessun record, o si clicca sul tasto "Annulla/Chiudi" il form permette di creare un nuovo record.
Struttura e comportamento atteso:
- La pagina Admin deve avere una tabella la cui ultima colonna "Azioni" deve avere i tasti "Modifica" ed "Elimina".
- Al click di "Modifica" deve comparire un modal che permette di modificare il record. Una volta confermata la modifica deve presentarsi messaggio di success o di errore (appena sopra il tasto conferma).
- Al click di "Elimina" deve essere eseguita l'operazione di delete del record con la logica di 2 step confirm (Vedi Gestione - Utenti).
- Sopra la tabella ci deve essere il tasto "Crea nuovo record" (es: Crea nuovo utente) al cui click deve comparire il modal che permette di creare il nuovo record. Una volta confermata la creazione deve presentarsi messaggio di success o di errore (appena sopra il tasto conferma).
- **Implementazione**: da definire
- **Priority**: 🟢 LOW (nice to have, advanced feature)
- **Stato**: 🔴 TODO

---

## 📊 Piano di Implementazione (Priorità)

Fai scrivere qui ai tool AI il piano di implementazione dei vari task.
Qui dai ordine di priorità ai task.

---
