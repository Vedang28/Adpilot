-- AlterTable: add account_id column to integrations
-- Stores the platform-specific account identifier:
--   Meta  → ad account ID (numeric string, e.g. "act_1234567890")
--   Google → customer ID (numeric string, e.g. "1234567890")
ALTER TABLE "integrations" ADD COLUMN "account_id" TEXT;
