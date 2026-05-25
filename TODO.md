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

### 8. Upload immagini prodotti via Supabase Storage
**Stato**: 🔴 TODO
**Descrizione**: Sostituire l'attuale input testuale `image: string` (URL) nel form prodotto con un vero upload di file gestito da Supabase Storage. Oggi l'admin deve incollare un URL pubblico esterno; vogliamo che possa caricare un'immagine dal proprio device, salvarla su Supabase, e popolare automaticamente il campo `Product.image` con la URL pubblica restituita dallo storage.

**Decisioni di design (da confermare prima dell'implementazione)**:
- **Bucket policy**: `public` (read pubblico, write riservato al service role). Le immagini dei prodotti sono già destinate a essere visibili a tutti gli utenti dello shop, quindi non servono signed URL — risparmiamo round-trip e overhead lato client.
- **Auth model upload**: client → endpoint Next.js (`POST /api/admin/products/upload`) → storage. NON esponiamo l'anon key per consentire write client-side; usiamo `SUPABASE_SERVICE_ROLE_KEY` solo lato server (è sensibile, NON va sul client). L'endpoint richiede ruolo ADMIN.
- **Naming file**: `products/{nanoid}-{slug}.{ext}` per evitare collisioni e race condition su rinomine; nome originale ignorato per sicurezza (path traversal, caratteri esotici).
- **Validazione**: limite 5MB, MIME whitelist `image/jpeg|png|webp`, controllo magic bytes lato server (non solo Content-Type del client).
- **Cleanup orfani**: alla `PUT /api/products/[id]` se cambia `image` e la vecchia è hostata su Supabase → cancellare il vecchio blob. Stesso al `DELETE` del prodotto. Le immagini esterne (URL non-Supabase) restano intoccate.
- **Compat seed**: i prodotti seedati hanno URL esterni (Unsplash). Restano funzionanti senza migration: il campo è sempre uno string URL, indipendentemente dall'origine.

**Task**:
- [ ] Creare bucket `product-images` in Supabase Storage (via dashboard UI), policy public-read
- [ ] Aggiungere su Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service role solo server, NON `NEXT_PUBLIC_`)
- [ ] Aggiungere `@supabase/supabase-js` come dipendenza
- [ ] Creare `lib/storage.ts` con helper `uploadProductImage(file)` / `deleteProductImage(url)` che incapsulano il client Supabase server-side e il parsing dell'URL → bucket key
- [ ] Creare `app/api/admin/products/upload/route.ts` (POST, multipart/form-data): valida ADMIN, valida MIME+size+magic bytes, salva via helper, ritorna `{ url }`
- [ ] Aggiornare `app/dashboard/admin/products/ProductForm.tsx`: sostituire input text "image URL" con input `type="file"` + preview thumbnail + bottone "Rimuovi"; submit upload prima di chiamare il POST/PUT prodotto
- [ ] Hook cleanup nel `PUT /api/products/[id]`: se la `image` precedente era Supabase e cambia, cancellare il vecchio blob
- [ ] Hook cleanup nel `DELETE /api/products/[id]`: se l'image era Supabase, cancellare il blob
- [ ] Aggiungere il dominio Supabase a `next.config.ts` `images.remotePatterns` (se/quando passeremo da `<img>` a `next/image`)
- [ ] Smoke test manuale: upload nuovo prodotto, edit con sostituzione immagine (verificare che la vecchia sparisca dal bucket), delete prodotto (verificare cleanup)

**File coinvolti**:
- `lib/storage.ts` (NEW)
- `app/api/admin/products/upload/route.ts` (NEW)
- `app/api/products/[id]/route.ts` (cleanup on PUT/DELETE)
- `app/dashboard/admin/products/ProductForm.tsx` (file input + preview + upload pre-submit)
- `package.json` (dep `@supabase/supabase-js`)
- `next.config.ts` (eventuale `remotePatterns` se si passerà a `next/image`)
- Vercel env (NON committato): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Priority**: 🟡 MEDIUM (sblocca un workflow admin reale; oggi richiede già hosting esterno per ogni nuova immagine)

**Anti-scope**:
- Niente CDN custom o image transformation lato Supabase (storage raw + URL pubblica, basta).
- Niente upload multipli/galleria: per ora `Product` ha un solo campo `image`.
- Niente migration delle immagini Unsplash seedate: restano URL esterni.
- Niente progress bar fancy o drag&drop: input file standard + spinner durante upload.

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
- **Descrizione**: Le 4 tabelle admin (Users/Products/Orders/Inventory) avevano ~70% di markup duplicato (header, row clickabile + stopPropagation in colonna Azioni, modale, bottoni 2-step delete).
- **Implementazione**:
  - ✅ Nuovo componente generico `components/AdminTable.tsx` con API `AdminTableColumn<T>` (key, header, cell, align, sortable, hideOnMobile, mobileLabel) e props `rows`, `columns`, `rowKey`, `onRowClick`, `renderActions`, `emptyMessage`, sort opzionale
  - ✅ Pattern responsive: `<table>` desktop (`hidden sm:block`) + cards mobile (`block sm:hidden`) — stessa data, layout adattato
  - ✅ Refactor di tutte le 4 tabelle admin su `AdminTable`
  - ✅ Aggiunto Elimina 2-step in colonna Azioni di `OrdersTable` (era solo dentro `EditOrderPanel`)
  - ✅ Rimosso il blocco "Annulla ordine" da `EditOrderPanel` (ridondante)
- **Priority**: 🟢 LOW (nice to have, advanced feature)
- **Stato**: ✅ COMPLETATO

### **MIGLIORAMENTO #9**: Mobile responsiveness
- **Descrizione**: L'app era usabile solo su desktop. Header in overflow sotto md, tabelle admin con scroll-x illeggibile, modale stretto.
- **Implementazione**:
  - ✅ `Header.tsx`: hamburger menu sotto md (logo + ☰), dropdown con click-outside dismiss via useRef + mousedown listener
  - ✅ `AdminModal.tsx`: `max-w-md sm:max-w-lg lg:max-w-2xl` + `mx-4` su mobile + `max-h-[90vh]`
  - ✅ `AdminTable` con cards on mobile (vedi #8)
  - ✅ `CartItemsList` con `flex-wrap` per evitare schiacciamento qty/price/remove
- **Priority**: 🟢 LOW
- **Stato**: ✅ COMPLETATO

### **MIGLIORAMENTO #10**: UX polish minori
- **Descrizione**: 4 piccole migliorie UX raccolte dopo MVP.
- **Implementazione**:
  - ✅ Rimosso "Role:" dalla dashboard utente
  - ✅ Aggiunto link "Vai al carrello" sulla pagina prodotto (con `prefetch={false}`)
  - ✅ Indirizzo spedizione ora opzionale: vincolo ≥10 caratteri solo se compilato (sia checkout customer sia create-order admin)
  - ✅ `router.refresh()` dopo create/edit nei modali admin → tabella aggiornata appena chiuso il modale
  - ✅ Reset form dopo create riuscito (via cambio `key` → remount)
- **Priority**: 🟢 LOW
- **Stato**: ✅ COMPLETATO

---

### **MIGLIORAMENTO #11**: Riorganizzazione componenti
- **Descrizione**: Alcuni form stavano in `components/` pur essendo usati da una sola pagina, altri erano già co-locati. Inconsistente.
- **Implementazione**:
  - ✅ `ProductForm.tsx` → `app/dashboard/admin/products/`
  - ✅ `CheckoutForm.tsx` → `app/shop/checkout/`
  - ✅ `AddToCartForm.tsx` → `app/shop/products/[id]/`
  - ✅ `CartItemsList.tsx` → `app/shop/_components/` (folder `_`-prefixed = non-routable, condiviso solo dentro `app/shop`)
  - ✅ Eliminato `components/ProductDialog.tsx` (dead code, zero import)
  - ✅ `components/` ora contiene solo componenti effettivamente cross-page (Header, AdminModal, AdminTable, AccessDenied)
- **Priority**: 🟢 LOW
- **Stato**: ✅ COMPLETATO

---

### **MIGLIORAMENTO #12**: Inconsistenza prezzo/nome prodotto negli ordini storici
- **Descrizione**: Modificando un prodotto in "Admin Prodotti" (es. cambio di prezzo/nome), gli ordini già creati si comportano in modo non uniforme:
  - In **Admin Ordini** (lato admin) NON si aggiorna né il prezzo né il nome (mostra i valori snapshot di quando l'ordine è stato creato).
  - In **"I miei Ordini"** (lato customer) si aggiorna SOLO il nome (perché lo legge dal `Product` corrente), mentre il prezzo resta quello storico.
  Il comportamento "snapshot" è corretto di regola (un ordine già emesso non deve cambiare di valore), ma:
  1. l'inconsistenza tra le due viste (una mostra il nome corrente, l'altra il nome storico) va sanata
  2. in Admin Ordini ha senso poter **modificare gli OrderItem** (quantity + price) per gestire correzioni manuali post-vendita

- **Decisioni di design** (vincolanti per l'implementazione):

  **A. NO cascade Product → OrderItem**. Quando un admin modifica `Product.price` o `Product.name` su Admin Prodotti, gli `OrderItem` degli ordini già creati NON vengono toccati. Motivazione:
  - Un ordine emesso è una **transazione finanziaria sigillata nel tempo**: cambiare retroattivamente il prezzo di un OrderItem stravolgerebbe ricevute, fatture, contabilità, audit trail e gestione resi/rimborsi.
  - L'esistenza stessa di `OrderItem.price` come colonna separata da `Product.price` esprime questa intenzione: è uno **snapshot** del valore al momento dell'ordine, non un riferimento vivo. Lo stesso vale per il nome (da snapshottare in `OrderItem.productName`).
  - L'unico path legittimo per modificare un OrderItem dopo la creazione è la **modifica manuale esplicita** dell'admin (vedi task "EditOrderPanel" sotto), tracciata e intenzionale — non un effetto collaterale della modifica di un altro record.

  **B. Drop di `Order.total`**. Rimuoviamo il campo `total` dalla tabella `Order` e lo calcoliamo on-the-fly come `sum(items.quantity * items.price)` ovunque serva (UI cliente, UI admin, conferma ordine).
  - **Pro**: single source of truth (i `OrderItem` *sono* la verità sull'ammontare). Elimina una classe di bug di staleness, particolarmente acuti ora che gli admin potranno editare quantity/price (ogni edit dovrebbe altrimenti ricomputare e ripersistere `total` — un passo extra che è facile dimenticare). Semplifica l'edit flow.
  - **Contro accettato**: a scala MVP è equivalente come perf (gli items sono già caricati con l'ordine ovunque). A volume molto alto si potrebbe reintrodurre `total` come cache denormalizzata (con ricomputo coerente sugli edit).
  - **Caveat futuro**: se un giorno entreranno campi a livello ordine (shipping, tax, discount, fee), `total ≠ sum(items)` e la formula andrà estesa (`sum(items) + shipping + tax - discount`). A quel punto il campo `total` può anche essere reintrodotto come cache, ma la formula resta calcolabile.

- **Task**:
  - [x] **Schema Prisma**: aggiunto `productName String` su `OrderItem` (snapshot del nome al momento dell'ordine). Migration con backfill dai record esistenti (`UPDATE "OrderItem" SET "productName" = p.name FROM "Product" p WHERE "OrderItem"."productId" = p.id`).
  - [x] **Schema Prisma**: rimosso il campo `total` da `Order`. Migration con drop column (nessun backfill: ricomputabile dai `OrderItem`).
  - [x] **Endpoint `POST /api/orders` e `POST /api/admin/orders`**: scrivono `productName` accanto a `price` su create OrderItem. Rimosso write di `total`.
  - [x] **Tutti i reader del totale**: sostituiti con `order.items.reduce((s, i) => s + i.quantity * i.price, 0)` in:
    - `app/dashboard/orders/page.tsx`
    - `app/dashboard/admin/orders/OrdersTable.tsx`
    - `app/dashboard/admin/orders/EditOrderPanel.tsx`
    - `app/shop/order-confirmation/[id]/page.tsx`
  - [x] **Tutti i reader del nome**: usano `item.productName` (snapshot) ovunque, eliminando l'inconsistenza tra vista admin (snapshot) e vista customer (vivo).
  - [x] **EditOrderPanel — manual edit OrderItem (admin only)**: UI per aggiungere/rimuovere/editare `productId`, `productName`, `quantity` e `price` degli `OrderItem`. `QuantityStepper` con `max = inventory.quantity + originalQty` (la quota già allocata a questo ordine non va sottratta dalla disponibilità).
  - [x] **Endpoint `PUT /api/admin/orders/[id]`**: accetta `items[]` con `productId/productName/quantity/price`. Calcola delta per prodotto in transazione, applica `decrement: delta` (delta negativo = increment), sostituisce le rows `OrderItem` con `deleteMany + create`. Verifica disponibilità pre-transazione (available + oldQty per prodotto).
- **File coinvolti**:
  - `prisma/schema.prisma` (aggiunto `OrderItem.productName`, droppato `Order.total`)
  - `prisma/migrations/20260525120000_add_orderitem_productname_drop_order_total/` (migration con backfill di `productName` + drop di `total`)
  - `app/api/orders/route.ts` (scrive `productName`, rimosso `total`)
  - `app/api/admin/orders/route.ts` (scrive `productName`, rimosso `total`)
  - `app/api/admin/orders/[id]/route.ts` (PUT con delta inventory + replace items + bump esplicito di `updatedAt`)
  - `app/dashboard/admin/orders/EditOrderPanel.tsx` (UI edit items)
  - `app/dashboard/admin/orders/OrdersTable.tsx` (totale calcolato + `selectedOrder` derivato dalla prop `orders`)
  - `app/dashboard/orders/page.tsx` (totale calcolato + nome snapshot)
  - `app/shop/order-confirmation/[id]/page.tsx` (totale calcolato + nome snapshot)
- **Note di implementazione (post-test)**:
  - **Bug "modale stale dopo Salva articoli"**: `OrdersTable` teneva `selectedOrder` come oggetto in state → dopo `router.refresh()` la prop `orders` si aggiornava ma il riferimento restava vecchio. Fix: store solo `selectedOrderId`, derivare `selectedOrder = orders.find(o => o.id === selectedOrderId)` ad ogni render.
  - **Bug "updatedAt non bumpato su edit items"**: con `prisma.order.update({ data: { items: { create: [...] } } })` (solo nested writes, niente scalar fields) Prisma può saltare l'UPDATE sul parent → `@updatedAt` non scatta. Fix: aggiunto `updatedAt: new Date()` esplicito nel branch items del PUT.
- **Priority**: 🟡 MEDIUM (consistenza dati + tool admin utile)
- **Stato**: ✅ COMPLETATO

---

### **MIGLIORAMENTO #13**: Input prezzo prodotto scomodo su mobile
- **Descrizione**: In "Admin Prodotti" il form Crea/Modifica usa `<input type="number">` per il prezzo. Su mobile la tastiera numerica non gestisce bene i decimali (varia per OS), il pulsante stepper occupa spazio, e accidentalmente lo scroll della pagina può modificare il valore. Trovare un componente più ergonomico.
- **Task**:
  - [ ] Valutare alternativa: `<input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]+">` con parsing manuale + locale italiano (virgola come separatore)
  - [ ] In alternativa: libreria tipo `react-number-format` o componente custom con maschera (€ prefix, 2 decimali fissi)
  - [ ] Verificare comportamento su iOS Safari + Android Chrome
  - [ ] Disabilitare scroll-to-change valore (`onWheel={(e) => e.currentTarget.blur()}`)
  - [ ] Validazione: numero positivo, max 2 decimali
- **File coinvolti**:
  - `app/dashboard/admin/products/ProductForm.tsx`
  - eventuale nuovo `components/PriceInput.tsx` se l'estrazione ha senso
- **Priority**: 🟢 LOW (UX polish, non bloccante)
- **Stato**: 🔴 TODO

---

### **MIGLIORAMENTO #14**: Stripe come opzione disabilitata nei metodi di pagamento
- **Descrizione**: La select del metodo di pagamento (sia checkout customer sia create-order admin) mostra `CASH | PAYPAL | STRIPE` tutti selezionabili, ma Stripe non è ancora integrato (vedi Next Step #6). Vogliamo che Stripe appaia nella lista (per "telegrafare" la prossima feature) ma sia **disabilitato** finché l'integrazione non è pronta.
- **Task**:
  - [ ] In `CheckoutForm` (`app/shop/checkout/CheckoutForm.tsx`): aggiungere `disabled` all'option `STRIPE` con label tipo "Stripe (in arrivo)"
  - [ ] Stessa cosa in `CreateOrderForm` e `EditOrderPanel` lato admin
  - [ ] Validazione server-side in `app/api/orders/route.ts` e `app/api/admin/orders/route.ts`: rifiutare `paymentMethod === 'STRIPE'` con errore esplicito ("Stripe non ancora disponibile") finché non implementato — difesa in profondità contro POST diretti
  - [ ] Una volta completato Next Step #6, rimuovere il `disabled` e il check server-side
- **File coinvolti**:
  - `app/shop/checkout/CheckoutForm.tsx`
  - `app/dashboard/admin/orders/CreateOrderForm.tsx`
  - `app/dashboard/admin/orders/EditOrderPanel.tsx`
  - `app/api/orders/route.ts`
  - `app/api/admin/orders/route.ts`
- **Priority**: 🟢 LOW (UX, evita ordini con metodo non gestito)
- **Stato**: 🔴 TODO

---

## 📊 Piano di Implementazione (Priorità)

Fai scrivere qui ai tool AI il piano di implementazione dei vari task.
Qui dai ordine di priorità ai task.

---
