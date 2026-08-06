/*
  Warnings:

  - The values [COMPLETED_WITH_ERRORS] on the enum `ImportStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ImportStatus_new" AS ENUM ('PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');
ALTER TABLE "public"."Import" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Import" ALTER COLUMN "status" TYPE "ImportStatus_new" USING ("status"::text::"ImportStatus_new");
ALTER TYPE "ImportStatus" RENAME TO "ImportStatus_old";
ALTER TYPE "ImportStatus_new" RENAME TO "ImportStatus";
DROP TYPE "public"."ImportStatus_old";
ALTER TABLE "Import" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';
COMMIT;
