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

> #1, #2, #3, #4, #5, #6, #7 e #8 di questa iterazione sono stati completati e spostati in [CHANGELOG.md](./CHANGELOG.md#-iterazione-2026-05-26).

### #9 — Righe selezionabili per azione su più record
**Stato**: 🟡 IN LAVORAZIONE
**Priority**: 🟢 LOW (UX, non bloccante)

**Descrizione**: Selezione multipla via checkbox + action bar bulk per applicare azioni su più record contemporaneamente. Iniziato da Admin Utenti, da estendere ad Admin Ordini.

**Fatto** (commit pending push):
- [x] `AdminTable` esteso con prop opt-in `selectable` / `selectedIds` / `onToggleRowSelection` / `onToggleAllVisible` (retrocompatibile: le altre tabelle non cambiano comportamento finché non passano `selectable={true}`).
- [x] `Admin Utenti`: checkbox per riga + header con select-all-visibili (stato indeterminato per selezione parziale) + action bar "Cambia ruolo a..." + auto-prune della selezione quando cambiano filtri/sort (per evitare ghost-edit di righe non visibili).
- [x] Endpoint `POST /api/admin/users/bulk` con `prisma.updateMany` atomico + self-demotion guard estesa (admin loggato non può togliersi il ruolo ADMIN da nessun endpoint, single PUT e bulk).

**Da fare**:
- [ ] **Admin Ordini**: portare la stessa selezione multipla in `OrdersTable`. Casi d'uso da concordare: cambio status bulk (es. tutti i selezionati → `CONFERMATO`), eliminazione bulk?
- [ ] Endpoint bulk per ordini: `POST /api/admin/orders/bulk { ids, status }` con `updateMany`. Da decidere se gestire lo stesso ripristino inventory di MIGLIORAMENTO #2 anche in transizione bulk verso `ANNULLATO` (atomic + restore stock per ogni order item dei selezionati).
- [ ] Smoke test: bulk status change su 3-5 ordini in stati diversi.

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

### Step 9-bis. Template messaggi WhatsApp in DB (follow-up di Step 9)
**Stato**: 🔴 TODO (backlog non bloccante)
**Descrizione**: Spostare i template dei messaggi WhatsApp da `lib/whatsapp.ts` (hardcoded) a una tabella `MessageTemplate { key, body }` editabile a runtime tramite UI admin. Per ora resta hardcoded perché redeploy Vercel su git push è ~90s e il single-admin (te) ha accesso al codice.

**Trigger di promozione** (uno qualsiasi → diventa Priority MEDIUM):
1. Vuoi che un non-developer modifichi i testi dei messaggi.
2. I wording cambiano più di una volta a settimana.
3. Servono varianti per locale/cliente/contesto stagionale.

**Task indicativi** (da rifinire al momento della promozione):
- [ ] Migration: nuova tabella `MessageTemplate` (`key String @unique`, `body String`, `updatedAt`)
- [ ] Seed dei template attuali (`whatsapp.greeting`, `whatsapp.order`)
- [ ] `lib/whatsapp.ts`: refactor — i template builder leggono da DB con cache in memoria (TTL ~60s) e fallback hardcoded se la chiave manca
- [ ] Validazione placeholder server-side: parsing del body per verificare che le `{name}`, `{shortId}`, `{orderUrl}` referenziate corrispondano a quelle attese dal contesto (rifiuto al save con messaggio esplicito altrimenti)
- [ ] Pagina admin `/dashboard/admin/messages`: lista template + form di edit con preview "esempio reso"
- [ ] Smoke test: edit di un template via UI → click WhatsApp → messaggio aggiornato senza redeploy

**Anti-scope** (da preservare anche dopo il refactor):
- Niente versioning storico dei template (a meno di esplicita richiesta)
- Niente auth di approvazione editoriale (single-admin tool)
- Niente i18n: una lingua sola

**Priority**: 🔵 BACKLOG (promuovere quando si verifica uno dei trigger)

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
