# Compliance legale (Italia / UE)

> ⚠️ **Disclaimer**: questo documento è un riepilogo tecnico-organizzativo non vincolante,
> redatto da uno sviluppatore (non avvocato, non commercialista). Per portare l'app in
> produzione consultare professionisti — i punti sotto sono tracce di lavoro, non pareri.

## Stato attuale

**MVP per uso personale + amici** (sostituto di un Excel di tracking ordini interno).
Finché non si incassano pagamenti da consumatori italiani in modo abituale, nessuno dei
requisiti sotto è obbligatorio. Questo documento serve come **checklist per quando** (e se)
si volesse aprire l'uso a clienti reali.

## Soglia di applicabilità

| Scenario | Compliance richiesta |
|---|---|
| Uso interno/amici, nessun pagamento reale | Nessuna |
| Vendite occasionali tra privati, senza P.IVA | Solo informativa privacy minima |
| E-commerce abituale verso consumatori IT | **Tutto quanto sotto** |

## 1. Privacy / GDPR (Reg. UE 2016/679)

- [ ] **Privacy policy** pubblicata e linkata da footer/registrazione (oggi assente)
- [ ] **Cookie policy** (i cookie NextAuth sono "tecnici" → niente banner di consenso, ma
      l'informativa va comunque pubblicata)
- [ ] **Registro dei trattamenti** (art. 30 GDPR)
- [ ] **DPA (Data Processing Agreement)** firmati con i sub-processor:
  - Google (OAuth, indirettamente identità utenti)
  - Vercel (hosting, processa tutti i dati a runtime)
  - Supabase (DB persistente)
- [ ] **Trasferimenti extra-UE**: Vercel/Google → USA. Servono Standard Contractual Clauses
      o adesione al Data Privacy Framework. Da documentare nella privacy policy.
- [ ] **Procedure data breach**: notifica al Garante entro 72h dalla scoperta (art. 33 GDPR)
- [ ] **DPO**: solo se c'è "trattamento sistematico su larga scala" — improbabile a scala MVP
- [ ] **Diritti dell'interessato**: meccanismo per esportare/cancellare i dati di un utente
      (oggi parzialmente coperto dal CRUD utenti admin, ma manca self-service)

## 2. Codice del Consumo (D.lgs. 206/2005)

- [ ] **Pulsante "Ordine con obbligo di pagamento"** (art. 51 c. 2): il bottone finale di
      checkout DEVE avere quel testo esatto o equivalente inequivocabile
      ("Acquista ora" non basta secondo la giurisprudenza prevalente)
- [ ] **Diritto di recesso 14 giorni**: modulo standard scaricabile + procedura di reso
- [ ] **Garanzia legale di conformità 24 mesi** (art. 128+ Codice Consumo)
- [ ] **Informazioni precontrattuali obbligatorie** (art. 49):
  - Caratteristiche essenziali del prodotto
  - Prezzo TOTALE comprensivo di tasse + spedizione (oggi mostriamo solo il prezzo prodotto)
  - Identità venditore + contatti
  - Modalità di pagamento, consegna, esecuzione
  - Condizioni e termini di recesso

## 3. Direttiva e-commerce (D.lgs. 70/2003)

- [ ] Pagina **"Chi siamo"** con: ragione sociale, P.IVA, numero REA, indirizzo, email,
      PEC, eventuale iscrizione albo
- [ ] **Email di conferma ordine** (in TODO come "Email Notifications - SendGrid")
- [ ] **Termini e Condizioni** accessibili pre-acquisto, con accettazione esplicita
      (checkbox al checkout)

## 4. Fiscale

- [ ] **Partita IVA** se l'attività è abituale (anche poche vendite ma continuative).
      Soglia "occasionale" interpretata caso per caso.
- [ ] **Regime fiscale**: forfettario / ordinario — da scegliere col commercialista in base
      a volumi attesi
- [ ] **Fattura elettronica via SDI**:
  - Obbligatoria B2B
  - Estesa a B2C per quasi tutti i regimi (incluso forfettario sopra €25k dal 2024)
- [ ] **Scontrino/ricevuta elettronica** per le vendite B2C (in alternativa o in aggiunta
      alla fattura, dipende dal caso)
- [ ] **CU (Certificazione Unica)** se ci sono collaboratori

## 5. Pagamenti

- [ ] **Stripe** gestisce PCI-DSS in autonomia (vantaggio del provider hosted)
- [ ] **Limite contanti**: €5.000 attuale (D.L. 152/2021 e successive modifiche). Il
      `paymentMethod = CASH` (cash on delivery) deve comunque produrre scontrino al momento
      della consegna.
- [ ] **PayPal**: regolato come istituto di pagamento, nessun obbligo aggiuntivo lato app
- [ ] **Antiriciclaggio**: scatta solo per soglie alte di pagamento contanti, irrilevante a
      scala MVP

## 6. Accessibilità — European Accessibility Act (D.lgs. 82/2022)

- [ ] Dal **28 giugno 2025** l'e-commerce verso consumatori UE deve essere conforme
      **WCAG 2.1 livello AA**
- [ ] **Esonero micro-imprese**: <10 dipendenti **e** fatturato annuo <€2M (probabile
      copertura per la nostra scala)
- [ ] Anche con esonero, l'accessibilità è buona pratica — l'app è già discretamente
      navigabile da tastiera, ma servirebbero audit (contrast ratio, screen reader,
      attributi ARIA su modal e tour)

## 7. Prodotti specifici (NON applicabile al MVP attuale)

Categorie con regole proprie da considerare se il catalogo cambia:
- Alimentari → etichettatura, allergeni, tracciabilità
- Alcolici/tabacco → vendita a minorenni, accise
- Farmaci → vendita ammessa solo a farmacie autorizzate
- Cosmetici → registrazione CPNP UE
- Armi/munizioni → autorizzazioni specifiche

## Roadmap consigliata se si decide di andare in produzione

1. **Commercialista** — apertura P.IVA, regime fiscale, integrazione fatturazione
   elettronica (può richiedere endpoint dedicati o gestionale esterno)
2. **Avvocato/consulente privacy** — privacy policy, T&C, DPA, registro trattamenti
3. **Implementazione tecnica nel codice**:
   - Pagina `/legal/privacy`, `/legal/terms`, `/legal/cookies`
   - Footer con identità venditore
   - Checkbox accettazione T&C al checkout (server-side validation)
   - Pulsante checkout con testo "Ordine con obbligo di pagamento"
   - Modulo recesso scaricabile + endpoint admin per gestire i resi
   - Self-service "Esporta i miei dati" / "Cancella account" nella dashboard utente
   - Email transazionali (conferma ordine, recesso, spedizione) — già in TODO #5
   - Integrazione fatturazione elettronica (es. via API di Fatture in Cloud o simili)
4. **Audit**:
   - Privacy: revisione legale dei testi
   - Accessibilità: audit WCAG (anche se in esonero, riduce rischio reclami)
   - Sicurezza: pen test su flusso pagamenti se gestito direttamente

## Note

- I cookie tecnici di NextAuth (sessione) **non richiedono banner di consenso** secondo le
  linee guida del Garante 2021. Vanno solo dichiarati nella cookie policy.
- L'integrazione Google OAuth implica condivisione di metadata (email, profile) con Google
  — da menzionare in privacy policy.
- Il flusso `CartReservation` non ha implicazioni legali specifiche: è un meccanismo tecnico
  interno, non una "prenotazione" nel senso del diritto contrattuale.
