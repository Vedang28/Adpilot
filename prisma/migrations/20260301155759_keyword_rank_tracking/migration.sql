-- AlterTable
ALTER TABLE "keywords" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "keyword_ranks" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "keyword_ranks_keyword_id_recorded_at_idx" ON "keyword_ranks"("keyword_id", "recorded_at");

-- CreateIndex
CREATE INDEX "keyword_ranks_team_id_recorded_at_idx" ON "keyword_ranks"("team_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "keywords_team_id_is_active_idx" ON "keywords"("team_id", "is_active");

-- AddForeignKey
ALTER TABLE "keyword_ranks" ADD CONSTRAINT "keyword_ranks_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_ranks" ADD CONSTRAINT "keyword_ranks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
