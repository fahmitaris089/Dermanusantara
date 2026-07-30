-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "cover_image_alt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "highlights" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "story" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "campaign_stat_baselines" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "collected_amount" BIGINT NOT NULL DEFAULT 0,
    "collected_quantity" INTEGER NOT NULL DEFAULT 0,
    "paid_donation_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "campaign_stat_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_updates" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '[]',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "campaign_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_stat_baselines_campaign_id_key" ON "campaign_stat_baselines"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_updates_campaign_id_published_at_idx" ON "campaign_updates"("campaign_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_updates_campaign_id_sort_order_key" ON "campaign_updates"("campaign_id", "sort_order");

-- AddForeignKey
ALTER TABLE "campaign_stat_baselines" ADD CONSTRAINT "campaign_stat_baselines_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_updates" ADD CONSTRAINT "campaign_updates_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
