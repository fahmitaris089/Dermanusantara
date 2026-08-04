import { CampaignsService } from './campaigns.service';

describe('CampaignsService progress baseline', () => {
  it('adds historical baseline to PAID donation aggregates', async () => {
    const prisma = {
      donation: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { baseAmount: BigInt(500_000), quantity: 20 },
          _count: { id: 4 },
        }),
      },
    };
    const service = new CampaignsService(prisma as never);
    const card = await (
      service as unknown as {
        card: (campaign: unknown) => Promise<{
          progress: {
            collectedAmount: number;
            collectedQuantity: number;
            paidDonationCount: number;
          };
        }>;
      }
    ).card({
      id: 'campaign-id',
      slug: 'sedekah-al-quran',
      title: 'Sedekah Al-Quran',
      shortDescription: 'Description',
      coverImageUrl: 'https://example.com/image.jpg',
      coverImageAlt: 'Image',
      category: { code: 'WAKAF', name: 'Wakaf' },
      donationConfig: { inputType: 'QUANTITY' },
      statBaseline: {
        collectedAmount: BigInt(44_500_000),
        collectedQuantity: 1780,
        paidDonationCount: 314,
      },
      targetMetric: 'AMOUNT',
      targetAmount: BigInt(60_000_000),
      targetQuantity: null,
      endsAt: null,
      isFeatured: true,
    });

    expect(card.progress).toMatchObject({
      collectedAmount: 45_000_000,
      collectedQuantity: 1800,
      paidDonationCount: 318,
    });
  });

  it('returns at most five latest paid donors', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      campaign: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'campaign-id',
          slug: 'operasional-pondok',
          title: 'Operasional Pondok',
          shortDescription: 'Description',
          description: 'Long description',
          coverImageUrl: '/image.webp',
          coverImageAlt: 'Image',
          location: null,
          category: { code: 'PENDIDIKAN', name: 'Pendidikan' },
          donationConfig: {
            inputType: 'MONEY',
            currency: 'IDR',
            minimumAmount: BigInt(10_000),
            maximumAmount: null,
            allowCustomAmount: true,
          },
          donationOptions: [],
          paymentMethods: [],
          updates: [],
          story: [],
          highlights: [],
          statBaseline: null,
          targetMetric: 'AMOUNT',
          targetAmount: BigInt(1_000_000),
          targetQuantity: null,
          endsAt: null,
          isFeatured: false,
        }),
      },
      donation: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { baseAmount: null, quantity: null },
          _count: { id: 0 },
        }),
        findMany,
      },
      systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    await new CampaignsService(prisma as never).detail('operasional-pondok');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PAID' }),
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
    );
  });
});
