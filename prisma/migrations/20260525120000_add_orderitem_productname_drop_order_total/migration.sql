-- AlterTable: aggiunta colonna nullable per backfill
ALTER TABLE "OrderItem" ADD COLUMN "productName" TEXT;

-- Backfill: copia il nome corrente del Product nello snapshot OrderItem.productName.
-- Per ordini storici accettiamo che lo "snapshot" rifletta il nome attuale: non
-- abbiamo cronologia dei nomi, ed è comunque coerente con quello che il cliente vedeva.
UPDATE "OrderItem"
SET "productName" = "Product"."name"
FROM "Product"
WHERE "OrderItem"."productId" = "Product"."id";

-- Vincolo NOT NULL dopo il backfill
ALTER TABLE "OrderItem" ALTER COLUMN "productName" SET NOT NULL;

-- Drop denormalized total (ricomputabile da sum(items.quantity * items.price))
ALTER TABLE "Order" DROP COLUMN "total";
