# Order App - TODO List

> Per i task **completati** vedi [CHANGELOG.md](./CHANGELOG.md).

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
  - Admin Inventario: RU
  - Admin Ordini: CRUD, in particolare creazione di un ordine per conto di altro utente + export tabella

---

## 🔥 Nuova priorità (2026-05-26)

Lista di requisiti raccolti il 2026-05-26, in ordine di priorità decrescente (1 = primo da fare).

> #1, #2, #5, #6 e #8 di questa iterazione sono stati completati e spostati in [CHANGELOG.md](./CHANGELOG.md#-iterazione-2026-05-26).

### #3 — Data consegna come campo dedicato — DECISO: `Product.deliveryDate`
**Stato**: 🟡 DA IMPLEMENTARE (decisione presa)  
**Priority**: 🟡 MEDIUM

**Decisione**: aggiungere `deliveryDate DateTime?` (opzionale) sulla tabella `Product`, NON su `Order`. Motivazione:
- Il prezzo di un articolo cambia per data di consegna → la data è un attributo intrinseco del Product (variant), non dell'Order che lo ordina.
- Con il modello attuale "un Product per (articolo, data)" la data esplicita rimpiazza la convenzione del nome (`"Prodotto X 28-05-2026"`) e abilita filtri/ordinamento tipizzati.
- Quando il catalogo crescerà valuteremo un refactor a Product master + ProductVariant (rimandato come backlog).

**Task**:
- [ ] Migration Prisma: `Product.deliveryDate DateTime?`
- [ ] Aggiornare `ProductForm` in `app/dashboard/admin/products/ProductForm.tsx`: `<input type="date">` con label "Data di consegna (opzionale)"
- [ ] Endpoint `POST /api/products` e `PUT /api/products/[id]`: accettare e persistere `deliveryDate`
- [ ] Validator `lib/validators.ts`: aggiungere campo a `productSchema`
- [ ] Aggiungere colonna "Data consegna" in `ProductsTable` (admin), formattata `DD/MM/YYYY`, sortable
- [ ] Aggiungere filtro range data in `ProductsTable` (riusare `FiltersAccordion` + pattern già usato in OrdersTable)
- [ ] Decidere se mostrarla anche nello shop (probabile sì, sotto il nome). Da confermare prima di implementare lato customer.
- [ ] Backfill manuale dei prodotti esistenti se hanno la data nel nome (es. `"Prodotto X 28-05-2026"` → estrarre data, ripulire nome). Opzionale, da decidere caso per caso.

---

### #4 — Parità tabella Storico Ordini ↔ Admin Ordini
**Stato**: 🔴 TODO  
**Priority**: 🟡 MEDIUM

**Descrizione**: allineare le due tabelle dove differiscono. Oggi:
- **Storico (customer)**: ha filtro per prodotto (select dei prodotti acquistati). Admin no.
- **Admin**: ha pill colorate per articoli (snapshot `productName` × qty) e tasto Aggiorna. Customer no — mostra solo il count e non ha tasto refresh.

**Task**:
- [ ] Aggiungere filtro prodotto a `OrdersTable` admin (select coi prodotti effettivamente presenti negli ordini → derivata da `orders[].items[].productId`, simile a [CustomerOrdersTable](app/dashboard/orders/CustomerOrdersTable.tsx))
- [ ] Estendere il filtro per prodotto al reset filtri (`filtersActive` + `resetFilters`)
- [ ] Sostituire la cella "Articoli" di `CustomerOrdersTable` con le pill blu (stesso markup di `OrdersTable`: badge `qty× nome` con flex-wrap)
- [ ] Aggiungere tasto Aggiorna su `CustomerOrdersTable`
- [ ] Verificare che CSV export non sia impattato (l'export è solo admin, già OK)

**File coinvolti**:
- `app/dashboard/admin/orders/OrdersTable.tsx`
- `app/dashboard/orders/CustomerOrdersTable.tsx`

---

### #7 — Loader globale durante le fetch
**Stato**: 🔴 TODO  
**Priority**: 🟢 LOW (UX, non bloccante)

**Descrizione**: durante chiamate al backend (POST/PUT/DELETE) bloccare le interazioni della pagina con un overlay loader, per evitare double-submit e click accidentali.

**Approcci possibili**:
- **A. Locale per form**: ogni form gestisce il proprio `loading` state e disabilita i bottoni (è quello che già abbiamo). Non blocca la pagina intera.
- **B. Provider globale**: un context `<LoadingProvider>` montato in `app/layout.tsx` con metodo `withLoader(promise)` che mostra un overlay full-screen per la durata della Promise.
- **C. Wrapper fetch**: un `fetchWithLoader` in `lib/fetch.ts` che incrementa/decrementa un counter globale (zustand store, jotai, o context). Tutte le chiamate passano da lì.

**Decisione provvisoria**: **opzione C**, perché i fetch sono già sparsi in molti file e un wrapper minimizza i cambi. Counter globale (atomico) → overlay quando count > 0.

**Task**:
- [ ] Creare `lib/fetch.ts` con `apiFetch(url, init)` che incrementa counter prima, decrementa dopo (try/finally)
- [ ] Store: zustand semplice (già una dep utile in altri punti) oppure context+useSyncExternalStore. Da valutare.
- [ ] Componente `<GlobalLoader />` montato in layout: overlay `fixed inset-0 bg-black/30 z-[100]` con spinner al centro, visibile quando count > 0, `pointer-events-none` sul resto OFF (cioè overlay cattura i click)
- [ ] Refactor incrementale: sostituire `fetch(...)` con `apiFetch(...)` nei file più sensibili (admin orders edit, checkout, ecc.). Non serve farlo tutto subito.
- [ ] Verificare che il loader non mascheri errori di rete (toast/alert di errore devono comparire SOPRA l'overlay)

**File coinvolti**:
- `lib/fetch.ts` (NEW)
- `components/GlobalLoader.tsx` (NEW)
- `app/layout.tsx` (mount)
- Refactor progressivo in tutti i client component che fanno fetch

---

### #9 — In Admin Utenti Tasto Disabilita tutti gli utenti
**Stato**: 🔴 TODO  
**Priority**: 🟢 LOW (UX, non bloccante)

**Descrizione**: Nella pagina Gestione Utenti sarebbe comodo poter selezionare tutti o alcuni utenti e cambiare per tutti il ruolo a NUOVO o altro.

---

## 🚀 Next Steps

### Step 5. Email Notifications (SendGrid)
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

### Step 6. Payment Integration (Stripe)
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

### Step 7. Reports & Analytics (Dashboard Admin)
**Stato**: 🔴 TODO  
**Descrizione**: Aggiungere report e analytics per admin

**Task**:
- [ ] Dashboard con statistiche: sales, orders, revenue
- [ ] Grafici ordini per mese/settimana
- [ ] Esportazione report (CSV/PDF)
- [ ] Analisi inventory: prodotti in stock, low stock alerts

---

### Step 8. Upload immagini prodotti via Supabase Storage
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

## Backlog non bloccanti — Reservation system

Possibili miglioramenti futuri per il [Product Reservation System](./CHANGELOG.md#4bis-product-reservation-system) già completato:

- [ ] Endpoint admin `POST /api/admin/inventory/reconcile` per ricalcolare `Inventory.reserved` dalla somma delle `CartReservationItem` non scadute (utile in caso di drift dovuto a manipolazione manuale del DB)
- [ ] Cron job per cleanup di `CartReservation` scadute (al momento il cleanup è lazy: avviene su prossima GET/POST reserve dell'utente stesso)
- [ ] Advisory lock / `SELECT FOR UPDATE` su Inventory per concorrenza estrema cross-user (ora basta unique constraint per-user)

---

## 📊 Piano di Implementazione (Priorità)

Fai scrivere qui ai tool AI il piano di implementazione dei vari task.
Qui dai ordine di priorità ai task.

---
