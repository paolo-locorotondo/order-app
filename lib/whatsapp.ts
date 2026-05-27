/**
 * Helper per i deep link WhatsApp (`https://wa.me/<numero>?text=<messaggio>`).
 *
 * Il deep link apre la chat con il messaggio precompilato; l'utente preme
 * "Invio" manualmente. Niente WhatsApp Business API qui.
 */

/**
 * Strippa tutti i caratteri non numerici. Ritorna `null` se il risultato non
 * è un numero plausibile in formato internazionale (richiesto dal deep link).
 *
 * Regole:
 *   - 7-15 cifre dopo lo strip (E.164 max è 15 cifre, min plausibile ~7).
 *   - Niente conversione automatica a partire dal "+" o "00" (sarebbe già stato
 *     strippato): assumiamo che chi inserisce il numero lo abbia messo con il
 *     country code. Un numero "nudo" italiano tipo `333...` (9 cifre) verrebbe
 *     comunque accettato dalla regex ma fallirebbe in pratica su WhatsApp.
 *     La validazione "deve avere il country code" sta a livello UI/Zod.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
    if (raw == null) return null;
    const digits = String(raw).replace(/\D+/g, "");
    if (digits.length < 7 || digits.length > 15) return null;
    return digits;
}

/**
 * Costruisce l'URL `wa.me`. Ritorna `null` se il numero non è valido — il
 * caller (es. WhatsAppButton) può usare questo segnale per non renderizzare.
 */
export function buildWhatsAppUrl(
    phone: string | null | undefined,
    message?: string,
): string | null {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    const base = `https://wa.me/${normalized}`;
    if (!message) return base;
    return `${base}?text=${encodeURIComponent(message)}`;
}

/**
 * Messaggio generico di saluto. Usato quando l'admin apre la chat dalla pagina
 * Utenti (nessun contesto ordine specifico).
 */
export function greetingMessage(name: string | null | undefined): string {
    const safeName = (name ?? "").trim();
    return safeName ? `Ciao ${safeName}, ti scrivo da Order App.` : "Ciao, ti scrivo da Order App.";
}

/**
 * Messaggio contestualizzato a un ordine specifico. Include short ID e link
 * cliccabile alla pagina di order-confirmation (richiede URL assoluto, vedi
 * NEXT_PUBLIC_APP_URL).
 */
export function orderMessage(opts: {
    name: string | null | undefined;
    shortId: string;
    orderUrl: string;
}): string {
    const safeName = (opts.name ?? "").trim();
    const greeting = safeName ? `Ciao ${safeName},` : "Ciao,";
    return [
        greeting,
        `ti scrivo riguardo all'ordine #${opts.shortId}.`,
        `Puoi vedere il dettaglio qui: ${opts.orderUrl}`,
    ].join("\n");
}

/**
 * URL canonica dell'app, da usare per costruire link assoluti nei messaggi.
 * Letta da `NEXT_PUBLIC_APP_URL` (vedi README). Se mancante, fallback a
 * stringa vuota — il caller può decidere se generare comunque il messaggio
 * con path relativo (non cliccabile in chat) o omettere il link.
 */
export function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

/**
 * Componi l'URL assoluto della pagina di conferma ordine, dato l'orderId.
 * Ritorna stringa vuota se NEXT_PUBLIC_APP_URL non è settata.
 */
export function buildOrderConfirmationUrl(orderId: string): string {
    const base = getAppUrl().replace(/\/+$/, ""); // rimuove trailing slash
    if (!base) return "";
    return `${base}/shop/order-confirmation/${orderId}`;
}
