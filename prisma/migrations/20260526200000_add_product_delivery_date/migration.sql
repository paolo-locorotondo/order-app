-- Aggiunge il campo opzionale "deliveryDate" a Product.
-- Nessun backfill: i prodotti seedati con la data nel nome restano invariati,
-- l'admin la popolerà manualmente quando vorrà.
ALTER TABLE "Product" ADD COLUMN "deliveryDate" TIMESTAMP(3);
