-- AlterTable: add password reset columns to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_reset_token"  TEXT,
  ADD COLUMN IF NOT EXISTS "password_reset_expiry" TIMESTAMPTZ;
