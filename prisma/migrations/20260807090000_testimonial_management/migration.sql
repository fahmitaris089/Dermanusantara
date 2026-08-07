CREATE TABLE "testimonials" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "role" VARCHAR(100),
  "quote" VARCHAR(220) NOT NULL,
  "photo_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "testimonials_is_active_sort_order_idx" ON "testimonials"("is_active", "sort_order");

INSERT INTO "testimonials" ("id", "name", "role", "quote", "is_active", "sort_order", "updated_at") VALUES
  ('testimonial_m_fawwaz', 'M. Fawwaz', 'Donatur', 'Tampilan websitenya mudah dipahami. Sejak pertama kali membuka, saya bisa melihat pilihan program dan informasi donasi dengan jelas.', true, 0, CURRENT_TIMESTAMP),
  ('testimonial_ayu_daffa', 'Ayu Daffa', 'Donatur', 'Proses memilih program hingga mendapatkan informasi pembayaran terasa sederhana. Semoga Derma Nusantara terus menjaga keterbukaan informasinya.', true, 1, CURRENT_TIMESTAMP),
  ('testimonial_m_faaiz', 'M. Faaiz', 'Donatur', 'Peluncuran website ini membuat akses ke program kebaikan terasa lebih praktis. Saya berharap kabar kegiatan dan penyalurannya dapat diperbarui secara rutin.', true, 2, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
