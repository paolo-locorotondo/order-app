-- Rename OrderStatus enum: from English 5-state to Italian 7-state
-- with explicit mapping for existing rows.
--
-- Mapping:
--   PENDING   -> IN_ATTESA
--   PAID      -> PAGATO_DA_CONSEGNARE
--   SHIPPED   -> SPEDITO
--   DELIVERED -> CONSEGNATO_E_PAGATO
--   CANCELLED -> ANNULLATO
--
-- New values without backfill:
--   CONFERMATO, CONSEGNATO_DA_PAGARE

-- 1. Create the new enum type with the new Italian values.
CREATE TYPE "OrderStatus_new" AS ENUM (
    'IN_ATTESA',
    'CONFERMATO',
    'SPEDITO',
    'PAGATO_DA_CONSEGNARE',
    'CONSEGNATO_DA_PAGARE',
    'CONSEGNATO_E_PAGATO',
    'ANNULLATO'
);

-- 2. Drop the default on the column (Postgres can't change type with a default in place).
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;

-- 3. Convert the column to the new enum, mapping each old value.
ALTER TABLE "Order"
    ALTER COLUMN "status" TYPE "OrderStatus_new"
    USING (
        CASE "status"::text
            WHEN 'PENDING'   THEN 'IN_ATTESA'
            WHEN 'PAID'      THEN 'PAGATO_DA_CONSEGNARE'
            WHEN 'SHIPPED'   THEN 'SPEDITO'
            WHEN 'DELIVERED' THEN 'CONSEGNATO_E_PAGATO'
            WHEN 'CANCELLED' THEN 'ANNULLATO'
        END::"OrderStatus_new"
    );

-- 4. Drop the old enum and rename the new one to take its place.
DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

-- 5. Restore the default with the new value.
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'IN_ATTESA';
