# Changelog

Storico dei task, delle migliorie e dei bug fix completati su Order App.
Per i prossimi passi vedi [TODO.md](./TODO.md).

---

## ✅ Features completate

### 1. Gestione Pagina Admin Prodotti (CRUD)

**Descrizione**: Gestione completa dei prodotti con create, read, update, delete.

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

**Descrizione**: Implementare il flusso completo di checkout del carrello e creazione ordini.

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

**Descrizione**: Pagina CRUD per admin per gestire ordini.

**Task**:
- [x] Tabella con lista degli ordini filtrabile per stato ordine
- [x] Modifica ordine (Per ora si può aggiornare solo lo stato)
- [x] Elimina ordine + restore inventory per ogni OrderItem
- [x] Crea ordine per conto di altro utente + update inventory per ogni OrderItem

---

### 4. Customer Orders History

**Descrizione**: Refactor della pagina "I miei ordini" in tabella filtrabile + modale di dettaglio read-only.

**Task completati**:
- [x] Refactor di `app/dashboard/orders/page.tsx`: server component che fetcha gli ordini dell'utente e li passa a un nuovo client component
- [x] `app/dashboard/orders/CustomerOrdersTable.tsx` (NEW): tabella basata su `AdminTable` con filtri (status come pulsanti coerenti con admin + select prodotto derivata dagli ordini dell'utente) e sort cliccabile su `createdAt`/`updatedAt`
- [x] `app/dashboard/orders/OrderDetailsPanel.tsx` (NEW): panel read-only mostrato dentro `AdminModal` con numero ordine (slice 8), date creazione/modifica, status badge, indirizzo, metodo pagamento, lista articoli (productName snapshot + qty × price) e totale calcolato on-the-fly
- [x] Bottone "Dettaglio" in colonna Azioni + click su riga aprono lo stesso modale

**Decisioni di design**:
- **Filtro prodotto** = select popolata dai prodotti effettivamente presenti negli ordini dell'utente (derivata client-side da `orders[].items[].productId+productName`). Più preciso di un input testo libero, e non richiede fetch aggiuntivi.
- **Componente dettaglio separato** (non `EditOrderPanel` con flag `readOnly`): evita di inquinare il panel admin con condizionali e riduce la superficie del codice customer.
- **Totale calcolato** dagli items (`sum(qty × price)`), coerente con MIGLIORAMENTO #12 (drop di `Order.total`).

**File creati/modificati**:
- `app/dashboard/orders/page.tsx` (UPDATED)
- `app/dashboard/orders/CustomerOrdersTable.tsx` (NEW)
- `app/dashboard/orders/OrderDetailsPanel.tsx` (NEW)

---

### 4bis. Product Reservation System

**Descrizione**: Durante checkout, "riservare" i prodotti per 5 minuti. Se timer scade, liberarli e uscire.

**Task completati**:
- [x] Aggiungere campo `reserved` a Inventory
- [x] Aggiungere model `CartReservation` + `CartReservationItem` (server come fonte di verità)
- [x] OnCheckoutPageLoad: GET reservation esistente o POST per crearne una (idempotente)
- [x] UseEffect con timer: alla scadenza, decrementare `reserved` e redirect a `/shop/cart?expired=true`
- [x] OnOrderSuccess: `quantity` e `reserved` decrementati, `CartReservation` cancellata
- [x] OnOrderCancel ("Torna al carrello"): release reservation con quantità salvate sul server
- [x] Cart in pagina checkout ora `readOnly` (nessun bottone Rimuovi/quantity per evitare modifiche durante checkout)
- [x] Test E2E manuali: happy path, reload, torna al carrello, scadenza timer, stato sporco, multi-prodotto, Strict Mode

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

---

## 🐞 Bug fix

### BUG 1: Disponibilità non aggregata su prodotti duplicati nello stesso ordine

- **Descrizione**: Nella pagina "Gestione - Ordini" nel form di creazione ordine, supponendo che in inventory il prodotto X ha disponibilità 10, quando aggiungo un prodotto X con quantità 5 e poi clicco "Aggiungi prodotto" e aggiungo sempre il prodotto X ma con quantità 6, l'ordine va a buon fine, invece avrebbe dovuto dare errore "Superata disponibilità del prodotto. Disponibili: 10, richieste: 11"
- **File**: `app/api/admin/orders/route.ts` (la validazione era client+server item-per-item, non aggregata per productId)
- **Fix**: aggregazione delle quantità per `productId` prima della validazione + decrement; tutto wrappato in transazione `prisma.$transaction` per atomicità
- **Priority**: 🔴 HIGH (inconsistenza dati)

---

## ⚡ Migliorie

### MIGLIORAMENTO #7: Gestione paymentMethod come Enum

- **File**: `prisma/schema.prisma`
- **Descrizione**: Usare una Enum per il paymentMethod ed usare questa enum generata da prisma in tutta l'applicazione.
- **Implementazione**:
  - ✅ Usare enum `PaymentMethods { CASH, PAYPAL, STRIPE }` invece di String come tipo del campo `paymentMethod`
  - ✅ Refactor: tutti i valori hardcoded relativi alle enum prisma sostituiti con queste enum
- **Priority**: 🟢 LOW

---

### MIGLIORAMENTO #8: Conformare struttura delle pagine Admin

- **Descrizione**: Le 4 tabelle admin (Users/Products/Orders/Inventory) avevano ~70% di markup duplicato (header, row clickabile + stopPropagation in colonna Azioni, modale, bottoni 2-step delete).
- **Implementazione**:
  - ✅ Nuovo componente generico `components/AdminTable.tsx` con API `AdminTableColumn<T>` (key, header, cell, align, sortable, hideOnMobile, mobileLabel) e props `rows`, `columns`, `rowKey`, `onRowClick`, `renderActions`, `emptyMessage`, sort opzionale
  - ✅ Pattern responsive: `<table>` desktop (`hidden sm:block`) + cards mobile (`block sm:hidden`) — stessa data, layout adattato
  - ✅ Refactor di tutte le 4 tabelle admin su `AdminTable`
  - ✅ Aggiunto Elimina 2-step in colonna Azioni di `OrdersTable` (era solo dentro `EditOrderPanel`)
  - ✅ Rimosso il blocco "Annulla ordine" da `EditOrderPanel` (ridondante)
- **Priority**: 🟢 LOW

---

### MIGLIORAMENTO #9: Mobile responsiveness

- **Descrizione**: L'app era usabile solo su desktop. Header in overflow sotto md, tabelle admin con scroll-x illeggibile, modale stretto.
- **Implementazione**:
  - ✅ `Header.tsx`: hamburger menu sotto md (logo + ☰), dropdown con click-outside dismiss via useRef + mousedown listener
  - ✅ `AdminModal.tsx`: `max-w-md sm:max-w-lg lg:max-w-2xl` + `mx-4` su mobile + `max-h-[90vh]`
  - ✅ `AdminTable` con cards on mobile (vedi #8)
  - ✅ `CartItemsList` con `flex-wrap` per evitare schiacciamento qty/price/remove
- **Priority**: 🟢 LOW

---

### MIGLIORAMENTO #10: UX polish minori

- **Descrizione**: Piccole migliorie UX raccolte dopo MVP.
- **Implementazione**:
  - ✅ Rimosso "Role:" dalla dashboard utente
  - ✅ Aggiunto link "Vai al carrello" sulla pagina prodotto (con `prefetch={false}`)
  - ✅ Indirizzo spedizione ora opzionale: vincolo ≥10 caratteri solo se compilato (sia checkout customer sia create-order admin)
  - ✅ `router.refresh()` dopo create/edit nei modali admin → tabella aggiornata appena chiuso il modale
  - ✅ Reset form dopo create riuscito (via cambio `key` → remount)
- **Priority**: 🟢 LOW

---

### MIGLIORAMENTO #11: Riorganizzazione componenti

- **Descrizione**: Alcuni form stavano in `components/` pur essendo usati da una sola pagina, altri erano già co-locati. Inconsistente.
- **Implementazione**:
  - ✅ `ProductForm.tsx` → `app/dashboard/admin/products/`
  - ✅ `CheckoutForm.tsx` → `app/shop/checkout/`
  - ✅ `AddToCartForm.tsx` → `app/shop/products/[id]/`
  - ✅ `CartItemsList.tsx` → `app/shop/_components/` (folder `_`-prefixed = non-routable, condiviso solo dentro `app/shop`)
  - ✅ Eliminato `components/ProductDialog.tsx` (dead code, zero import)
  - ✅ `components/` ora contiene solo componenti effettivamente cross-page (Header, AdminModal, AdminTable, AccessDenied)
- **Priority**: 🟢 LOW

---

### MIGLIORAMENTO #12: Inconsistenza prezzo/nome prodotto negli ordini storici

- **Descrizione**: Modificando un prodotto in "Admin Prodotti" (es. cambio di prezzo/nome), gli ordini già creati si comportavano in modo non uniforme:
  - In **Admin Ordini** (lato admin) NON si aggiornava né il prezzo né il nome (mostrava i valori snapshot di quando l'ordine era stato creato).
  - In **"I miei Ordini"** (lato customer) si aggiornava SOLO il nome (perché lo leggeva dal `Product` corrente), mentre il prezzo restava quello storico.

  Il comportamento "snapshot" è corretto di regola (un ordine già emesso non deve cambiare di valore), ma:
  1. l'inconsistenza tra le due viste (una mostrava il nome corrente, l'altra il nome storico) andava sanata
  2. in Admin Ordini ha senso poter **modificare gli OrderItem** (quantity + price) per gestire correzioni manuali post-vendita

- **Decisioni di design** (vincolanti per l'implementazione):

  **A. NO cascade Product → OrderItem**. Quando un admin modifica `Product.price` o `Product.name` su Admin Prodotti, gli `OrderItem` degli ordini già creati NON vengono toccati. Motivazione:
  - Un ordine emesso è una **transazione finanziaria sigillata nel tempo**: cambiare retroattivamente il prezzo di un OrderItem stravolgerebbe ricevute, fatture, contabilità, audit trail e gestione resi/rimborsi.
  - L'esistenza stessa di `OrderItem.price` come colonna separata da `Product.price` esprime questa intenzione: è uno **snapshot** del valore al momento dell'ordine, non un riferimento vivo. Lo stesso vale per il nome (snapshottato in `OrderItem.productName`).
  - L'unico path legittimo per modificare un OrderItem dopo la creazione è la **modifica manuale esplicita** dell'admin (vedi task "EditOrderPanel" sotto), tracciata e intenzionale — non un effetto collaterale della modifica di un altro record.

  **B. Drop di `Order.total`**. Rimosso il campo `total` dalla tabella `Order` e calcolato on-the-fly come `sum(items.quantity * items.price)` ovunque serva (UI cliente, UI admin, conferma ordine).
  - **Pro**: single source of truth (i `OrderItem` *sono* la verità sull'ammontare). Elimina una classe di bug di staleness, particolarmente acuti ora che gli admin possono editare quantity/price (ogni edit dovrebbe altrimenti ricomputare e ripersistere `total` — un passo extra che è facile dimenticare). Semplifica l'edit flow.
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
