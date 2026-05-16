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
- Database seeding con dati di test (🔴 TODO rimuovere utenti di test)
- Shop: elenco di prodotti da poter aggiungere al carrello
- Carrello: lista di prodotti da poter aggiungere all'ordine durante il checkout
- Dashboard:
  - Lista ordini effettuati
- Dashboard Admin:
  - Admin Utenti: CRUD
  - Admin Prodotti: CRUD
  - Admin Inventario: per ora solo visualizza dati inventario (TODO CRUD?)
  - Admin Ordini: CRUD, in particolare creazione di un ordine per conto di altro utente

### Credenziali Test (🔴 TODO da rimuovere)
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


### 2B. Bug Fix & Improvements

#### BUG:

#### MIGLIORIE:

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

**MIGLIORAMENTO #8: Conformare struttura delle pagine Admin**
- **Descrizione**: Le pagine Admin hanno una tabella con una lista di record ed accanto un form di dettagio del record che permette di modificare il record selezionato. Se invece non è selezionato nessun record, o si clicca sul tasto "Annulla/Chiudi" il form permette di creare un nuovo record.
Struttura e comportamento atteso:
- ogni riga della tabella deve avere la colonna finale "Azioni" con i tasti "Modifica" e "Elimina". Al click di "Modifica" deve essere popolato il form, mentre al click di "Elimina" deve essere eseguita l'operazione di delete del record con la logica di 2 step confirm.
- cliccando sulla riga della tabella, il form diventa di "modifica" record e viene popolato con i dati del record selezionato nella tabella.
- cliccando sul tasto "X Annulla" in alto a destra del form, si deve svuotare il form e deve mostrare il "crea" record.
- onSubmit del form non deve essere svuotato, perchè deve mostrare il messaggo di successo "creato/modificato con successo".
- **Implementazione**: da definire
- **Priority**: 🟢 LOW (nice to have, advanced feature)
- **Stato**: 🔴 TODO

---

### 3. Admin Orders Dashboard
**Stato**: 🔴 TODO  
**Descrizione**: Pagina CRUD per admin per gestire ordini

**Task**:
- [X] Tabella con lista degli ordini filtrabile per stato ordine
- [X] Modifica ordine (Per ora si può aggiornare solo lo stato)
- [X] Elimina ordine + restore inventory per ogni OrderItem
- [ ] Crea ordine per conto di altro utente + update inventory per ogni OrderItem

---


### 4. Product Reservation System**
**Stato**: 🔴 TODO  
**Descrizione**: Durante checkout, "riservare" i prodotti per 5 minuti. Se timer scade, liberarli e uscire.

**Task**:
- [X] Aggiungere campo `reserved` a Inventory (✅ già esiste!)
- [ ] OnCheckoutPageLoad: incrementare `reserved` per ogni cartItem
- [ ] UseEffect con timer: dopo 5 min, decrementare `reserved` e redirect a `/shop/cart` con messaggio "Sessione checkout scaduta"
- [ ] OnOrderSuccess: `reserved` diventa parte di `quantity` decrement
- [ ] OnOrderCancel: riportare `reserved` a zero

---

### 5. Email Notifications (SendGrid)
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

## 📊 Piano di Implementazione (Priorità)

Fai scrivere qui ai tool AI il piano di implementazione dei vari task.
Qui dai ordine di priorità ai task.

---
