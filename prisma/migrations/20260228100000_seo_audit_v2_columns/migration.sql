-- Migration: seo_audit_v2_columns
-- Adds v2 engine columns to seo_audits without removing v1 columns.
-- v1 columns (technicalIssues, recommendations, overall_score) are kept
-- for backward compatibility — existing records remain readable via v1 mapper.

-- ── 1. Make v1 columns nullable ──────────────────────────────────────────────
-- overall_score was NOT NULL DEFAULT 0; v2 records set it when completed.
ALTER TABLE "seo_audits"
  ALTER COLUMN "overall_score" DROP NOT NULL,
  ALTER COLUMN "overall_score" DROP DEFAULT;

-- technicalIssues / recommendations were NOT NULL DEFAULT '[]'
-- v2 records leave them NULL; legacy records keep their existing values.
ALTER TABLE "seo_audits"
  ALTER COLUMN "technicalIssues" DROP NOT NULL,
  ALTER COLUMN "technicalIssues" DROP DEFAULT;

ALTER TABLE "seo_audits"
  ALTER COLUMN "recommendations" DROP NOT NULL,
  ALTER COLUMN "recommendations" DROP DEFAULT;

-- ── 2. Add engine metadata columns ───────────────────────────────────────────
ALTER TABLE "seo_audits"
  ADD COLUMN IF NOT EXISTS "engine_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "grade"          TEXT,
  ADD COLUMN IF NOT EXISTS "summary"        TEXT;

-- ── 3. Add v2 payload columns (all JSONB, all nullable) ──────────────────────
ALTER TABLE "seo_audits"
  ADD COLUMN IF NOT EXISTS "issues"           JSONB,
  ADD COLUMN IF NOT EXISTS "performance_data" JSONB,
  ADD COLUMN IF NOT EXISTS "category_scores"  JSONB,
  ADD COLUMN IF NOT EXISTS "raw_crawl_data"   JSONB;

-- ── 4. Add indexes ────────────────────────────────────────────────────────────
-- (teamId, status) for the duplicate-audit guard query in triggerAudit
-- (teamId, createdAt) for paginated audit history queries
CREATE INDEX IF NOT EXISTS "seo_audits_team_id_status_idx"
  ON "seo_audits" ("team_id", "status");

CREATE INDEX IF NOT EXISTS "seo_audits_team_id_created_at_idx"
  ON "seo_audits" ("team_id", "created_at");
