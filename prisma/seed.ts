import {
  CampaignStatus,
  ContributionInputType,
  PaymentMethodType,
  PrismaClient,
  TargetMetric,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sedekah = await prisma.campaignCategory.upsert({
    where: { code: 'SEDEKAH' },
    update: { name: 'Sedekah' },
    create: { code: 'SEDEKAH', name: 'Sedekah' },
  });
  const wakaf = await prisma.campaignCategory.upsert({
    where: { code: 'WAKAF' },
    update: { name: 'Wakaf' },
    create: { code: 'WAKAF', name: 'Wakaf' },
  });

  const paymentMethod = await prisma.paymentMethod.upsert({
    where: { code: 'MANUAL_BANK_TRANSFER' },
    update: {
      name: 'Transfer Bank',
      type: PaymentMethodType.MANUAL_TRANSFER,
      isActive: true,
      minimumAmount: 10_000,
      uniqueCodeEnabled: true,
      expiryMinutes: 1440,
    },
    create: {
      code: 'MANUAL_BANK_TRANSFER',
      name: 'Transfer Bank',
      type: PaymentMethodType.MANUAL_TRANSFER,
      isActive: true,
      minimumAmount: 10_000,
      uniqueCodeEnabled: true,
      expiryMinutes: 1440,
    },
  });

  await prisma.bankAccount.upsert({
    where: { id: 'bank_bsi_primary' },
    update: {
      bankName: 'Bank Syariah Indonesia',
      accountNumber: '7123456789',
      accountHolderName: 'Yayasan Derma Nusantara',
      instructions: [
        'Transfer tepat sesuai total pembayaran.',
        'Simpan nomor invoice untuk proses pengecekan.',
      ],
      isActive: true,
    },
    create: {
      id: 'bank_bsi_primary',
      bankName: 'Bank Syariah Indonesia',
      accountNumber: '7123456789',
      accountHolderName: 'Yayasan Derma Nusantara',
      instructions: [
        'Transfer tepat sesuai total pembayaran.',
        'Simpan nomor invoice untuk proses pengecekan.',
      ],
      isActive: true,
    },
  });

  const money = await prisma.campaign.upsert({
    where: { slug: 'orang-tua-asuh' },
    update: {
      categoryId: sedekah.id,
      title: 'Orang Tua Asuh',
      shortDescription: 'Pastikan santri dapat belajar tanpa perut kosong.',
      description: 'Program dukungan kebutuhan belajar dan pangan santri.',
      coverImageUrl: 'https://example.com/campaigns/orang-tua-asuh.jpg',
      status: CampaignStatus.PUBLISHED,
      acceptingDonations: true,
      isFeatured: true,
      targetMetric: TargetMetric.AMOUNT,
      targetAmount: 135_000_000,
    },
    create: {
      categoryId: sedekah.id,
      slug: 'orang-tua-asuh',
      title: 'Orang Tua Asuh',
      shortDescription: 'Pastikan santri dapat belajar tanpa perut kosong.',
      description: 'Program dukungan kebutuhan belajar dan pangan santri.',
      coverImageUrl: 'https://example.com/campaigns/orang-tua-asuh.jpg',
      status: CampaignStatus.PUBLISHED,
      acceptingDonations: true,
      isFeatured: true,
      targetMetric: TargetMetric.AMOUNT,
      targetAmount: 135_000_000,
    },
  });
  await prisma.campaignDonationConfig.upsert({
    where: { campaignId: money.id },
    update: {
      inputType: ContributionInputType.MONEY,
      currency: 'IDR',
      minimumAmount: 25_000,
      maximumAmount: null,
      allowCustomAmount: true,
      unitName: null,
      unitLabel: null,
      unitPrice: null,
      minimumQuantity: null,
      maximumQuantity: null,
      quantityStep: null,
    },
    create: {
      campaignId: money.id,
      inputType: ContributionInputType.MONEY,
      currency: 'IDR',
      minimumAmount: 25_000,
      allowCustomAmount: true,
    },
  });
  for (const [index, amount] of [25_000, 50_000, 100_000, 250_000].entries()) {
    await prisma.campaignDonationOption.upsert({
      where: { campaignId_amount: { campaignId: money.id, amount } },
      update: { sortOrder: index, isActive: true },
      create: {
        campaignId: money.id,
        amount,
        sortOrder: index,
        isActive: true,
      },
    });
  }

  const quantity = await prisma.campaign.upsert({
    where: { slug: 'sedekah-al-quran' },
    update: {
      categoryId: wakaf.id,
      title: 'Sedekah Al-Quran',
      shortDescription: 'Hadirkan Al-Quran layak baca untuk santri.',
      description: 'Program pengadaan Al-Quran layak baca untuk para santri.',
      coverImageUrl: 'https://example.com/campaigns/sedekah-al-quran.jpg',
      status: CampaignStatus.PUBLISHED,
      acceptingDonations: true,
      isFeatured: true,
      targetMetric: TargetMetric.QUANTITY,
      targetAmount: null,
      targetQuantity: 2000,
    },
    create: {
      categoryId: wakaf.id,
      slug: 'sedekah-al-quran',
      title: 'Sedekah Al-Quran',
      shortDescription: 'Hadirkan Al-Quran layak baca untuk santri.',
      description: 'Program pengadaan Al-Quran layak baca untuk para santri.',
      coverImageUrl: 'https://example.com/campaigns/sedekah-al-quran.jpg',
      status: CampaignStatus.PUBLISHED,
      acceptingDonations: true,
      isFeatured: true,
      targetMetric: TargetMetric.QUANTITY,
      targetQuantity: 2000,
    },
  });
  await prisma.campaignDonationConfig.upsert({
    where: { campaignId: quantity.id },
    update: {
      inputType: ContributionInputType.QUANTITY,
      currency: 'IDR',
      minimumAmount: null,
      maximumAmount: null,
      allowCustomAmount: null,
      unitName: 'Al-Quran',
      unitLabel: 'Quran',
      unitPrice: 25_000,
      minimumQuantity: 1,
      maximumQuantity: null,
      quantityStep: 1,
    },
    create: {
      campaignId: quantity.id,
      inputType: ContributionInputType.QUANTITY,
      currency: 'IDR',
      unitName: 'Al-Quran',
      unitLabel: 'Quran',
      unitPrice: 25_000,
      minimumQuantity: 1,
      quantityStep: 1,
    },
  });

  for (const campaignId of [money.id, quantity.id]) {
    await prisma.campaignPaymentMethod.upsert({
      where: {
        campaignId_paymentMethodId: {
          campaignId,
          paymentMethodId: paymentMethod.id,
        },
      },
      update: { isActive: true },
      create: { campaignId, paymentMethodId: paymentMethod.id, isActive: true },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: 'donation_defaults' },
    update: {
      value: {
        anonymousLabel: 'Hamba Allah',
        adminWhatsapp: '6281234567890',
        uniqueCodeMin: 1,
        uniqueCodeMax: 999,
      },
    },
    create: {
      key: 'donation_defaults',
      value: {
        anonymousLabel: 'Hamba Allah',
        adminWhatsapp: '6281234567890',
        uniqueCodeMin: 1,
        uniqueCodeMax: 999,
      },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
