## DOMANDE

1. cos'è il reorderPoint dell'inventario?
   **RISPOSTA:** `reorderPoint` è il livello minimo di stock. Quando l'inventario scende sotto questo valore, indica che è necessario ordinare più merce dai fornitori. Ad esempio: `reorderPoint: 5` significa "quando raggiungi 5 unità, ordina nuovo stock". È usato dai sistemi di gestione magazzino automatici per generare PO (Purchase Orders) ai fornitori. Nel nostro schema è impostato di default a 5, ma non lo stiamo ancora usando per automazioni.

2. cos'è stripePaymentId in Order?
   **RISPOSTA:** `stripePaymentId` è l'ID della transazione di pagamento generato da Stripe. Quando un utente paga tramite Stripe (carta di credito), Stripe crea una `PaymentIntent` e ritorna un ID univoco. Memorizziamo questo ID in Order per poter tracciare il pagamento, verificare lo status, processare rimborsi, e riconciliare i pagamenti tra il nostro DB e Stripe. Se `stripePaymentId` è NULL, significa che l'ordine non è ancora stato pagato (es. metodo "contrassegno") o il pagamento è fallito.

3. le variabili d'ambiente DATABASE_URL e DIRECT_URL perchè sono due? è possibile unirle in una sola variabile?
   **RISPOSTA:** `DATABASE_URL` è la connection string con connection pooling (Prisma Accelerate o PgBouncer), usata per query normali da web. `DIRECT_URL` è la connection diretta al database, usata per migrazioni, seed script, e bulk operations che non passano dal connection pool. In Supabase: DATABASE_URL usa il pool di connessioni, DIRECT_URL va direttamente al DB. Tecnicamente si potrebbero unire se non usi connection pooling, ma è meglio mantenerle separate per scalabilità e per evitare problemi di connessioni esaurite in produzione.

4. La chiamata http://localhost:3000/api/auth/session mostra dei dati sensibili se faccio inspect del browser. Verifica che sia gestito nella maniera più sicura e secondo le best practice di sicurezza.