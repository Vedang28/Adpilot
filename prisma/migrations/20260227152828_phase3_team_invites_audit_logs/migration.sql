-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_token_key" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "team_invites_team_id_email_idx" ON "team_invites"("team_id", "email");

-- CreateIndex
CREATE INDEX "team_invites_token_idx" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "audit_logs_team_id_created_at_idx" ON "audit_logs"("team_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "campaigns_team_id_status_idx" ON "campaigns"("team_id", "status");

-- CreateIndex
CREATE INDEX "campaigns_team_id_deleted_at_idx" ON "campaigns"("team_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
