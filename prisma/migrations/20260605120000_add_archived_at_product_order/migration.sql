-- Soft-archive: timestamp dell'ultima archiviazione (NULL = attivo).
-- Reversibile (UPDATE ... SET archivedAt = NULL = unarchive).
-- I record esistenti restano NULL → tutto attivo (compat backward).
ALTER TABLE "Product" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "archivedAt" TIMESTAMP(3);
