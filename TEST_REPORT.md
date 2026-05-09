# TEST REPORT

## BUG:

1. Nella pagina Shop
- Se ho effettuato il logout, mi permette di vedere i prodotti e di aggiungerli al carrello. Anche se l'aggiunta al carrello non ha nessun reale effetto a DB, mi compare la scritta "Prodotto aggiunto al carrello". Vorrei che il tasto "Aggingi al carrello" non fosse cliccabile se non loggati, quindi al click vorrei che porti prima alla pagina di login e poi ritorni alla pagina precedente.

2. Pagina Carrello /shop/cart
- Errore di mispelling, vedo "0 prodottoi" invece di "0 prodotti"
- L'aggiunta al carrello dei prodotti permette di superare il numero di disponibilità in inventario. Vorrei che ad ogni aggiunta si controlli la disponibilità in inventario e, se superata, compaia un errore "Superata disponibilità del prodotto". Inoltre sarebbe opportuno fare un controllo anche quando si clicca "procedi al checkout".

4. Pagina Checkout shop/checkout

- Mentre si è in questa pagina, avrebbe senso "riservare" quei prodotti e non renderli disponibili agli altri. Magari potremmo mettere un timer di 5 minuti dopodiche si esce in automatico da questa pagina, liberando quei prodotti.
- Nella sezione "Riepilogo Carrello" non riesco a modificare la quantità ne a cliccare il tasto "rimuovi" perchè?
- Avevo un prodotto con quantity 5 in inventario, ho provato a fare un ordine di 6 unità, ma una volta confermato l'ordine, l'inventario non è stato aggiornato perchè?.


## MIGLIORIE

1. Pagina storico ordini /dashboard/orders:
Aggiungere il tasto per vedere il dettaglio dell'ordine.

2. Pagina admin ordini:
Aggiungere le CRUD per gli utenti ADMIN:
- annulla ordine: elimina l'ordine e riprisinta i prodotti nell'inventario
- modifica ordine: cambia stato, metodo di pagamento, indirizzo di consegna
- crea ordine: questa pagina ha senso se l'admin vuole effettuare un ordine per conti di qualcun altro.


## DOMANDE

1. cos'è il reorderPoint dell'inventario?
   **RISPOSTA:** `reorderPoint` è il livello minimo di stock. Quando l'inventario scende sotto questo valore, indica che è necessario ordinare più merce dai fornitori. Ad esempio: `reorderPoint: 5` significa "quando raggiungi 5 unità, ordina nuovo stock". È usato dai sistemi di gestione magazzino automatici per generare PO (Purchase Orders) ai fornitori. Nel nostro schema è impostato di default a 5, ma non lo stiamo ancora usando per automazioni.

2. cos'è stripePaymentId in Order?
   **RISPOSTA:** `stripePaymentId` è l'ID della transazione di pagamento generato da Stripe. Quando un utente paga tramite Stripe (carta di credito), Stripe crea una `PaymentIntent` e ritorna un ID univoco. Memorizziamo questo ID in Order per poter tracciare il pagamento, verificare lo status, processare rimborsi, e riconciliare i pagamenti tra il nostro DB e Stripe. Se `stripePaymentId` è NULL, significa che l'ordine non è ancora stato pagato (es. metodo "contrassegno") o il pagamento è fallito.

