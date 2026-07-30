import {
  CampaignStatus,
  ContributionInputType,
  DonationStatus,
  PaymentMethodType,
  PaymentStatus,
  Prisma,
  PrismaClient,
  TargetMetric,
} from '@prisma/client';

const prisma = new PrismaClient();

const campaigns = [
  {
    slug: 'sedekah-al-quran',
    title: 'Sedekah Al-Quran',
    categoryCode: 'WAKAF',
    categoryName: 'Wakaf',
    description:
      'Bantu hadirkan Al-Quran layak baca untuk santri di pelosok nusantara.',
    location: 'Sulawesi Barat',
    imageUrl:
      'https://placehold.co/1200x750/png?text=Sedekah+Al-Quran',
    imageAlt: 'Placeholder campaign Sedekah Al-Quran.',
    targetMetric: TargetMetric.AMOUNT,
    targetAmount: 60_000_000,
    targetQuantity: null,
    endsAt: new Date('2026-08-23T23:59:59+07:00'),
    story: [
      'Masih banyak santri di wilayah pelosok yang belajar dengan mushaf yang sudah lusuh, tidak lengkap, atau harus digunakan bergantian. Kondisi ini membuat proses belajar berjalan lebih lambat dan kurang nyaman.',
      'Program Sedekah Al-Quran disusun untuk menghadirkan mushaf yang layak, mudah dibaca, dan siap langsung digunakan di pesantren serta rumah belajar komunitas. Penyaluran dilakukan bersama mitra lokal agar bantuan sampai ke titik yang benar-benar membutuhkan.',
      'Setiap donasi yang terkumpul akan membantu pengadaan, pengemasan, dan distribusi Al-Quran ke wilayah yang aksesnya tidak selalu mudah dijangkau. Tujuannya sederhana: santri bisa belajar dengan lebih tenang dan lebih bermartabat.',
    ],
    highlights: [
      'Distribusi melalui pesantren mitra dan relawan lokal.',
      'Setiap penyaluran disertai dokumentasi lapangan.',
      'Fokus pada mushaf layak baca untuk penggunaan harian.',
    ],
    config: {
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
    options: [] as number[],
    baseline: {
      collectedAmount: 44_650_000,
      collectedQuantity: 1786,
      paidDonationCount: 316,
    },
    updates: [
      {
        publishedAt: new Date('2026-07-18T09:00:00+07:00'),
        title: '120 mushaf baru tiba di gudang distribusi Mamuju.',
        excerpt:
          'Tim menerima mushaf tahap pertama untuk disortir sebelum penyaluran ke pesantren dampingan.',
        content: [
          'Sebanyak 120 mushaf baru telah tiba di titik distribusi Mamuju dan langsung masuk tahap pemeriksaan kualitas. Tim memastikan setiap mushaf dalam kondisi baik sebelum dikemas ulang untuk dikirim ke pesantren dampingan.',
          'Pengiriman tahap ini diprioritaskan untuk santri yang sebelumnya masih menggunakan mushaf lama secara bergantian. Dengan dukungan donatur, proses belajar Al-Quran diharapkan menjadi lebih nyaman dan tertib.',
        ],
      },
      {
        publishedAt: new Date('2026-07-12T09:00:00+07:00'),
        title:
          'Verifikasi kebutuhan tahap kedua selesai bersama mitra pesantren.',
        excerpt:
          'Relawan menyelesaikan pemetaan kebutuhan mushaf agar penyaluran berikutnya lebih tepat sasaran.',
        content: [
          'Verifikasi kebutuhan tahap kedua telah selesai dilakukan bersama pengurus pesantren mitra. Pendataan mencakup jumlah santri, kondisi mushaf yang tersedia, dan jadwal kegiatan belajar harian.',
          'Hasil verifikasi ini menjadi dasar distribusi berikutnya agar bantuan tidak hanya terkirim, tetapi benar-benar menjawab kebutuhan lapangan.',
        ],
      },
    ],
    donors: [
      {
        key: 'quran-anonymous',
        name: 'Hamba Allah',
        anonymous: true,
        amount: 100_000,
        quantity: 4,
        message: null,
        paidAt: new Date('2026-07-30T08:26:00+07:00'),
      },
      {
        key: 'quran-r-putri',
        name: 'R. Putri',
        anonymous: false,
        amount: 250_000,
        quantity: 10,
        message: 'Semoga menjadi amal jariyah.',
        paidAt: new Date('2026-07-30T08:00:00+07:00'),
      },
    ],
  },
  {
    slug: 'orang-tua-asuh',
    title: 'Orang Tua Asuh',
    categoryCode: 'SEDEKAH',
    categoryName: 'Sedekah',
    description:
      'Pastikan tidak ada santri yang belajar dalam keadaan perut kosong.',
    location: 'Jawa Barat',
    imageUrl:
      'https://placehold.co/1200x750/png?text=Orang+Tua+Asuh',
    imageAlt: 'Placeholder campaign Orang Tua Asuh.',
    targetMetric: TargetMetric.AMOUNT,
    targetAmount: 135_000_000,
    targetQuantity: null,
    endsAt: new Date('2026-08-11T23:59:59+07:00'),
    story: [
      'Di beberapa pesantren dampingan, kebutuhan pangan harian masih menjadi tantangan yang nyata. Saat pasokan menipis, santri tetap belajar dan beribadah dalam kondisi yang jauh dari ideal.',
      'Program Orang Tua Asuh hadir untuk memastikan kebutuhan pokok dan dukungan pembinaan santri bisa terpenuhi secara rutin. Dukungan donatur membantu menghadirkan bantuan yang lebih berkelanjutan bagi anak-anak yang sedang menempuh pendidikan.',
      'Dengan pola penyaluran yang lebih terukur, tim relawan dapat memprioritaskan pesantren dengan kebutuhan paling mendesak dan mengirimkan laporan perkembangan secara berkala kepada publik.',
    ],
    highlights: [
      'Menu pangan disesuaikan dengan kebutuhan harian santri.',
      'Prioritas untuk pesantren dengan keterbatasan logistik.',
      'Pemantauan penyaluran dilakukan bersama pengurus setempat.',
    ],
    config: {
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
    options: [25_000, 50_000, 100_000, 250_000],
    baseline: {
      collectedAmount: 120_212_000,
      collectedQuantity: 0,
      paidDonationCount: 1202,
    },
    updates: [
      {
        publishedAt: new Date('2026-07-21T09:00:00+07:00'),
        title: 'Penyaluran 600 porsi makan siang selesai di Cianjur.',
        excerpt:
          'Paket makan siang hangat disalurkan untuk santri yang mengikuti kegiatan belajar sepanjang hari.',
        content: [
          'Tim relawan menyalurkan 600 porsi makan siang hangat untuk santri di wilayah Cianjur. Paket makanan disiapkan sejak pagi bersama dapur mitra agar tiba tepat waktu saat jeda kegiatan belajar.',
          'Menu yang disalurkan terdiri dari nasi, lauk bernutrisi, sayur, dan air mineral. Pengurus pesantren menyampaikan bahwa bantuan pangan rutin sangat membantu menjaga energi santri selama mengikuti kegiatan belajar dan ibadah.',
        ],
      },
      {
        publishedAt: new Date('2026-07-16T09:00:00+07:00'),
        title: 'Stok beras tahap baru diterima dapur pesantren mitra.',
        excerpt:
          'Beras dari donasi terkumpul mulai diterima dan disiapkan untuk kebutuhan dapur harian pesantren.',
        content: [
          'Tim lapangan telah menerima dukungan tahap baru dari program Orang Tua Asuh. Bantuan ini akan digunakan untuk menunjang kebutuhan harian dan pendampingan santri selama beberapa pekan ke depan.',
          'Tim akan terus memantau penggunaan stok bersama pengurus dapur agar distribusi pangan tetap terukur, transparan, dan sesuai kebutuhan jumlah santri yang aktif.',
        ],
      },
    ],
    donors: [
      {
        key: 'parent-hambaa',
        name: 'Hambaa',
        anonymous: false,
        amount: 138_000,
        quantity: null,
        message: null,
        paidAt: new Date('2026-07-30T08:12:00+07:00'),
      },
      {
        key: 'parent-anonymous',
        name: 'Hamba Allah',
        anonymous: true,
        amount: 150_000,
        quantity: null,
        message: 'Berkah dunia akhirat.',
        paidAt: new Date('2026-07-30T08:08:00+07:00'),
      },
    ],
  },
  {
    slug: 'operasional-pondok',
    title: 'Operasional Pondok',
    categoryCode: 'PENDIDIKAN',
    categoryName: 'Pendidikan',
    description:
      'Dukung pendidikan anak yatim dhuafa untuk meraih cita-cita mereka.',
    location: 'Nusa Tenggara Barat',
    imageUrl:
      'https://placehold.co/1200x750/png?text=Operasional+Pondok',
    imageAlt: 'Placeholder campaign Operasional Pondok.',
    targetMetric: TargetMetric.AMOUNT,
    targetAmount: 190_000_000,
    targetQuantity: null,
    endsAt: new Date('2026-08-30T23:59:59+07:00'),
    story: [
      'Banyak anak yatim dhuafa memiliki semangat belajar yang tinggi, tetapi masih berhadapan dengan biaya sekolah, perlengkapan, dan kebutuhan penunjang lain yang tidak ringan bagi keluarga mereka.',
      'Program Operasional Pondok dirancang untuk membantu kebutuhan dasar pesantren seperti listrik, air, perlengkapan belajar, serta dukungan operasional harian agar kegiatan pembinaan tetap berjalan dengan baik.',
      'Kami bekerja sama dengan sekolah, wali, dan pendamping lokal agar bantuan tidak berhenti pada nominal, tetapi benar-benar menjadi dukungan yang terasa dalam kehidupan belajar sehari-hari.',
    ],
    highlights: [
      'Dukungan biaya sekolah dan perlengkapan belajar.',
      'Pendampingan bersama sekolah dan wali penerima manfaat.',
      'Seleksi penerima berdasarkan kebutuhan paling mendesak.',
    ],
    config: {
      inputType: ContributionInputType.MONEY,
      currency: 'IDR',
      minimumAmount: 50_000,
      maximumAmount: null,
      allowCustomAmount: true,
      unitName: null,
      unitLabel: null,
      unitPrice: null,
      minimumQuantity: null,
      maximumQuantity: null,
      quantityStep: null,
    },
    options: [50_000, 150_000, 300_000, 500_000],
    baseline: {
      collectedAmount: 84_400_000,
      collectedQuantity: 0,
      paidDonationCount: 425,
    },
    updates: [
      {
        publishedAt: new Date('2026-07-19T09:00:00+07:00'),
        title: 'Tahap verifikasi 40 calon penerima baru telah selesai.',
        excerpt:
          'Pendamping lokal menyelesaikan proses validasi calon penerima beasiswa untuk tahap berikutnya.',
        content: [
          'Tahap verifikasi 40 calon penerima baru telah selesai dilakukan bersama sekolah dan pendamping lokal. Proses ini memastikan bantuan diberikan kepada anak yatim dhuafa dengan kebutuhan pendidikan paling mendesak.',
          'Data yang dikumpulkan mencakup kondisi keluarga, kebutuhan sekolah, serta dukungan yang sudah tersedia. Hasil verifikasi akan menjadi acuan penyaluran beasiswa tahap berikutnya.',
        ],
      },
      {
        publishedAt: new Date('2026-07-10T09:00:00+07:00'),
        title: 'Distribusi perlengkapan sekolah semester ganjil dimulai.',
        excerpt:
          'Perlengkapan belajar mulai dikirim agar penerima manfaat siap memasuki semester baru.',
        content: [
          'Distribusi perlengkapan sekolah untuk semester ganjil sudah dimulai. Paket bantuan berisi tas, buku tulis, alat tulis, dan kebutuhan belajar dasar yang disesuaikan dengan jenjang pendidikan penerima manfaat.',
          'Program ini membantu anak-anak memulai semester baru dengan lebih percaya diri. Tim juga berkoordinasi dengan wali dan sekolah agar dukungan yang diberikan tetap relevan sepanjang masa belajar.',
        ],
      },
    ],
    donors: [
      {
        key: 'pondok-d-rahma',
        name: 'D. Rahma',
        anonymous: false,
        amount: 300_000,
        quantity: null,
        message: null,
        paidAt: new Date('2026-07-30T07:00:00+07:00'),
      },
      {
        key: 'pondok-anonymous',
        name: 'Hamba Allah',
        anonymous: true,
        amount: 500_000,
        quantity: null,
        message: 'Semoga adik-adik dimudahkan menuntut ilmu.',
        paidAt: new Date('2026-07-30T06:00:00+07:00'),
      },
    ],
  },
] satisfies Array<{
  slug: string;
  title: string;
  categoryCode: string;
  categoryName: string;
  description: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  targetMetric: TargetMetric;
  targetAmount: number | null;
  targetQuantity: number | null;
  endsAt: Date;
  story: string[];
  highlights: string[];
  config: {
    inputType: ContributionInputType;
    currency: string;
    minimumAmount: number | null;
    maximumAmount: number | null;
    allowCustomAmount: boolean | null;
    unitName: string | null;
    unitLabel: string | null;
    unitPrice: number | null;
    minimumQuantity: number | null;
    maximumQuantity: number | null;
    quantityStep: number | null;
  };
  options: number[];
  baseline: {
    collectedAmount: number;
    collectedQuantity: number;
    paidDonationCount: number;
  };
  updates: Array<{
    publishedAt: Date;
    title: string;
    excerpt: string;
    content: string[];
  }>;
  donors: Array<{
    key: string;
    name: string;
    anonymous: boolean;
    amount: number;
    quantity: number | null;
    message: string | null;
    paidAt: Date;
  }>;
}>;

async function main() {
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

  const bankAccount = await prisma.bankAccount.upsert({
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

  for (const definition of campaigns) {
    const category = await prisma.campaignCategory.upsert({
      where: { code: definition.categoryCode },
      update: { name: definition.categoryName },
      create: {
        code: definition.categoryCode,
        name: definition.categoryName,
      },
    });
    const campaign = await prisma.campaign.upsert({
      where: { slug: definition.slug },
      update: {
        categoryId: category.id,
        title: definition.title,
        shortDescription: definition.description,
        description: definition.description,
        coverImageUrl: definition.imageUrl,
        coverImageAlt: definition.imageAlt,
        location: definition.location,
        story: definition.story,
        highlights: definition.highlights,
        status: CampaignStatus.PUBLISHED,
        acceptingDonations: true,
        isFeatured: true,
        targetMetric: definition.targetMetric,
        targetAmount: definition.targetAmount,
        targetQuantity: definition.targetQuantity,
        startsAt: null,
        endsAt: definition.endsAt,
      },
      create: {
        categoryId: category.id,
        slug: definition.slug,
        title: definition.title,
        shortDescription: definition.description,
        description: definition.description,
        coverImageUrl: definition.imageUrl,
        coverImageAlt: definition.imageAlt,
        location: definition.location,
        story: definition.story,
        highlights: definition.highlights,
        status: CampaignStatus.PUBLISHED,
        acceptingDonations: true,
        isFeatured: true,
        targetMetric: definition.targetMetric,
        targetAmount: definition.targetAmount,
        targetQuantity: definition.targetQuantity,
        endsAt: definition.endsAt,
      },
    });

    await prisma.campaignDonationConfig.upsert({
      where: { campaignId: campaign.id },
      update: definition.config,
      create: { campaignId: campaign.id, ...definition.config },
    });
    await prisma.campaignDonationOption.updateMany({
      where: { campaignId: campaign.id },
      data: { isActive: false },
    });
    for (const [sortOrder, amount] of definition.options.entries()) {
      await prisma.campaignDonationOption.upsert({
        where: {
          campaignId_amount: { campaignId: campaign.id, amount },
        },
        update: { sortOrder, isActive: true },
        create: {
          campaignId: campaign.id,
          amount,
          sortOrder,
          isActive: true,
        },
      });
    }
    await prisma.campaignPaymentMethod.upsert({
      where: {
        campaignId_paymentMethodId: {
          campaignId: campaign.id,
          paymentMethodId: paymentMethod.id,
        },
      },
      update: { isActive: true },
      create: {
        campaignId: campaign.id,
        paymentMethodId: paymentMethod.id,
        isActive: true,
      },
    });
    await prisma.campaignStatBaseline.upsert({
      where: { campaignId: campaign.id },
      update: definition.baseline,
      create: { campaignId: campaign.id, ...definition.baseline },
    });
    await prisma.campaignUpdate.deleteMany({
      where: { campaignId: campaign.id },
    });
    await prisma.campaignUpdate.createMany({
      data: definition.updates.map((update, sortOrder) => ({
        campaignId: campaign.id,
        publishedAt: update.publishedAt,
        title: update.title,
        excerpt: update.excerpt,
        content: update.content,
        sortOrder,
      })),
    });

    for (const donor of definition.donors) {
      const publicId = `seed_${donor.key}`;
      await prisma.donation.upsert({
        where: { publicId },
        update: {
          campaignId: campaign.id,
          campaignTitleSnapshot: campaign.title,
          campaignSlugSnapshot: campaign.slug,
          inputTypeSnapshot: definition.config.inputType,
          quantity: donor.quantity,
          unitNameSnapshot: definition.config.unitName,
          unitLabelSnapshot: definition.config.unitLabel,
          unitPriceSnapshot: definition.config.unitPrice,
          baseAmount: donor.amount,
          donorName: donor.name,
          isAnonymous: donor.anonymous,
          publicMessage: donor.message,
          status: DonationStatus.PAID,
          paidAt: donor.paidAt,
        },
        create: {
          publicId,
          invoiceNumber: `SEED-${donor.key.toUpperCase()}`,
          campaignId: campaign.id,
          campaignTitleSnapshot: campaign.title,
          campaignSlugSnapshot: campaign.slug,
          inputTypeSnapshot: definition.config.inputType,
          quantity: donor.quantity,
          unitNameSnapshot: definition.config.unitName,
          unitLabelSnapshot: definition.config.unitLabel,
          unitPriceSnapshot: definition.config.unitPrice,
          baseAmount: donor.amount,
          currency: 'IDR',
          donorName: donor.name,
          donorWhatsapp: '6280000000000',
          isAnonymous: donor.anonymous,
          publicMessage: donor.message,
          status: DonationStatus.PAID,
          expiresAt: new Date(donor.paidAt.getTime() + 86_400_000),
          paidAt: donor.paidAt,
          payments: {
            create: {
              paymentMethodId: paymentMethod.id,
              bankAccountId: bankAccount.id,
              provider: 'MANUAL',
              baseAmount: donor.amount,
              uniqueCode: 0,
              payableAmount: donor.amount,
              activeUniqueKey: null,
              currency: 'IDR',
              status: PaymentStatus.VERIFIED,
              bankNameSnapshot: bankAccount.bankName,
              accountNumberSnapshot: bankAccount.accountNumber,
              accountHolderSnapshot: bankAccount.accountHolderName,
              instructionsSnapshot:
                bankAccount.instructions as Prisma.InputJsonValue,
              expiresAt: new Date(donor.paidAt.getTime() + 86_400_000),
              verifiedAt: donor.paidAt,
            },
          },
          statusHistories: {
            create: {
              toStatus: DonationStatus.PAID,
              reason: 'Imported historical campaign donor',
            },
          },
        },
      });
    }
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
