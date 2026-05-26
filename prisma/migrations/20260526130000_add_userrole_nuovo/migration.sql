-- Add NUOVO value to UserRole enum.
-- Postgres rifiuta ADD VALUE + uso nella stessa transazione (errore 55P04),
-- quindi rinominiamo e ricreiamo il tipo come fatto per OrderStatus.
-- Tutti i record esistenti (CUSTOMER/ADMIN) sono preservati.

CREATE TYPE "UserRole_new" AS ENUM ('NUOVO', 'CUSTOMER', 'ADMIN');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new"
  USING ("role"::text::"UserRole_new");

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'NUOVO';
