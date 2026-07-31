CREATE TABLE "hero_slides" (
  "id" TEXT NOT NULL,
  "desktop_image_url" TEXT NOT NULL,
  "desktop_image_alt" TEXT NOT NULL,
  "mobile_image_url" TEXT,
  "mobile_image_alt" TEXT,
  "link_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hero_slides_is_active_sort_order_idx" ON "hero_slides"("is_active", "sort_order");
