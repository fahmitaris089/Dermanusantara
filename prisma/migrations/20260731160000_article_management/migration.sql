CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "article_categories" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "articles" (
  "id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "author_name" TEXT NOT NULL,
  "read_time_minutes" INTEGER NOT NULL DEFAULT 5,
  "cover_image_url" TEXT NOT NULL,
  "cover_image_alt" TEXT NOT NULL,
  "cover_image_caption" TEXT,
  "content" JSONB NOT NULL DEFAULT '[]',
  "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMP(3),
  "disbursed_amount" BIGINT,
  "beneficiary_count" INTEGER,
  "beneficiary_unit" TEXT,
  "cta_title" TEXT,
  "cta_description" TEXT,
  "cta_starting_amount" BIGINT,
  "cta_verification_time" TEXT,
  "cta_button_label" TEXT,
  "cta_url" TEXT,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "og_image_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "article_categories_code_key" ON "article_categories"("code");
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");
CREATE INDEX "articles_status_published_at_idx" ON "articles"("status", "published_at");
CREATE INDEX "articles_category_id_status_published_at_idx" ON "articles"("category_id", "status", "published_at");
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "article_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
