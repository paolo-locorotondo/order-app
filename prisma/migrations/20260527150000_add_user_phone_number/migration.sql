-- Aggiunge il campo opzionale `phoneNumber` a User. Memorizzato in formato
-- internazionale solo cifre (normalizzato a livello applicativo via
-- lib/whatsapp.ts). Niente backfill: i record esistenti restano NULL.
ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;
