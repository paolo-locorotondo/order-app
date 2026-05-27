/**
 * Cutoff temporale per la visibilità dei prodotti nello shop.
 *
 * Un prodotto con `deliveryDate` resta visibile finché `deliveryDate >= cutoff`.
 * Il cutoff è `now + SHOP_HIDE_BEFORE_HOURS ore` (default 0).
 *
 * Esempi:
 *   - var assente o 0 → mostra tutto fino a "now" (un prodotto consegna oggi alle 18
 *     resta visibile fino a quel momento).
 *   - var = 24 → nascondi prodotti la cui consegna è entro 24h (lead time minimo
 *     per preparare l'ordine).
 *   - var = -24 → mostra anche prodotti la cui consegna è passata da meno di 24h
 *     (utile in fase di test o per mantenere visibili prodotti scaduti di poco).
 *
 * Valori non numerici (NaN/Infinity) vengono ignorati e si applica il default 0.
 */
export function shopVisibilityCutoff(): Date {
    const raw = process.env.SHOP_HIDE_BEFORE_HOURS;
    const hours = raw !== undefined ? Number(raw) : 0;
    const validHours = Number.isFinite(hours) ? hours : 0;
    return new Date(Date.now() + validHours * 60 * 60 * 1000);
}
