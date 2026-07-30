-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContributionInputType" AS ENUM ('MONEY', 'QUANTITY');

-- CreateEnum
CREATE TYPE "TargetMetric" AS ENUM ('AMOUNT', 'QUANTITY');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('MANUAL_TRANSFER', 'PAYMENT_GATEWAY');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING_PAYMENT', 'MANUAL_REVIEW', 'PAID', 'EXPIRED', 'CANCELLED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "campaign_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover_image_url" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "accepting_donations" BOOLEAN NOT NULL DEFAULT true,
    "target_metric" "TargetMetric",
    "target_amount" BIGINT,
    "target_quantity" INTEGER,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_donation_configs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "input_type" "ContributionInputType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "minimum_amount" BIGINT,
    "maximum_amount" BIGINT,
    "allow_custom_amount" BOOLEAN,
    "unit_name" TEXT,
    "unit_label" TEXT,
    "unit_price" BIGINT,
    "minimum_quantity" INTEGER,
    "maximum_quantity" INTEGER,
    "quantity_step" INTEGER,

    CONSTRAINT "campaign_donation_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_donation_options" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "label" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "campaign_donation_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "minimum_amount" BIGINT,
    "maximum_amount" BIGINT,
    "unique_code_enabled" BOOLEAN NOT NULL DEFAULT false,
    "expiry_minutes" INTEGER NOT NULL DEFAULT 1440,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "instructions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_payment_methods" (
    "campaign_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "campaign_payment_methods_pkey" PRIMARY KEY ("campaign_id","payment_method_id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_title_snapshot" TEXT NOT NULL,
    "campaign_slug_snapshot" TEXT NOT NULL,
    "input_type_snapshot" "ContributionInputType" NOT NULL,
    "quantity" INTEGER,
    "unit_name_snapshot" TEXT,
    "unit_label_snapshot" TEXT,
    "unit_price_snapshot" BIGINT,
    "base_amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "donor_name" TEXT NOT NULL,
    "donor_whatsapp" TEXT NOT NULL,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "public_message" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,
    "accept_language" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "geo_country" TEXT,
    "geo_province" TEXT,
    "geo_city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "provider" TEXT NOT NULL,
    "provider_reference" TEXT,
    "base_amount" BIGINT NOT NULL,
    "unique_code" INTEGER NOT NULL DEFAULT 0,
    "payable_amount" BIGINT NOT NULL,
    "active_unique_key" TEXT,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "bank_name_snapshot" TEXT,
    "account_number_snapshot" TEXT,
    "account_holder_snapshot" TEXT,
    "instructions_snapshot" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_status_histories" (
    "id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "from_status" "DonationStatus",
    "to_status" "DonationStatus" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_categories_code_key" ON "campaign_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");

-- CreateIndex
CREATE INDEX "campaigns_status_starts_at_ends_at_idx" ON "campaigns"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_donation_configs_campaign_id_key" ON "campaign_donation_configs"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_donation_options_campaign_id_amount_key" ON "campaign_donation_options"("campaign_id", "amount");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");

-- CreateIndex
CREATE UNIQUE INDEX "donations_public_id_key" ON "donations"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "donations_invoice_number_key" ON "donations"("invoice_number");

-- CreateIndex
CREATE INDEX "donations_campaign_id_status_idx" ON "donations"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_active_unique_key_key" ON "payments"("active_unique_key");

-- CreateIndex
CREATE INDEX "payments_donation_id_status_idx" ON "payments"("donation_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_key_key" ON "idempotency_records"("key");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_donation_id_key" ON "idempotency_records"("donation_id");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "campaign_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_donation_configs" ADD CONSTRAINT "campaign_donation_configs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_donation_options" ADD CONSTRAINT "campaign_donation_options_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_payment_methods" ADD CONSTRAINT "campaign_payment_methods_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_payment_methods" ADD CONSTRAINT "campaign_payment_methods_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_status_histories" ADD CONSTRAINT "donation_status_histories_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
