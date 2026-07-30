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
});
