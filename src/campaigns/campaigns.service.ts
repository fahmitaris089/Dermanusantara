import { HttpStatus, Injectable } from '@nestjs/common';
import { CampaignStatus, DonationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/domain.exception';
import { toNumber } from '../common/numbers';
import { ListCampaignsDto } from './dto/list-campaigns.dto';

const campaignInclude = {
  category: true,
  donationConfig: true,
  donationOptions: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
  paymentMethods: {
    where: { isActive: true, paymentMethod: { isActive: true } },
    include: { paymentMethod: true },
  },
} satisfies Prisma.CampaignInclude;

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(now = new Date()): Prisma.CampaignWhereInput {
    return {
      status: CampaignStatus.PUBLISHED,
      acceptingDonations: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    };
  }

  async list(query: ListCampaignsDto) {
    const where: Prisma.CampaignWhereInput = {
      ...this.activeWhere(),
      ...(query.category ? { category: { code: query.category } } : {}),
      ...(query.featured === undefined ? {} : { isFeatured: query.featured }),
    };
    const [campaigns, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        include: { category: true, donationConfig: true },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);
    const data = await Promise.all(campaigns.map((item) => this.card(item)));
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async detail(slug: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { slug, ...this.activeWhere() },
      include: campaignInclude,
    });
    if (!campaign) {
      throw new DomainException(
        'CAMPAIGN_NOT_FOUND',
        'Campaign tidak ditemukan.',
        HttpStatus.NOT_FOUND,
      );
    }
    const card = await this.card(campaign);
    const config = campaign.donationConfig;
    if (!config) {
      throw new DomainException(
        'CAMPAIGN_NOT_ACCEPTING_DONATIONS',
        'Konfigurasi donasi campaign belum tersedia.',
        HttpStatus.CONFLICT,
      );
    }
    const donationConfig =
      config.inputType === 'MONEY'
        ? {
            inputType: config.inputType,
            currency: config.currency,
            minimumAmount: toNumber(config.minimumAmount),
            maximumAmount: toNumber(config.maximumAmount),
            allowCustomAmount: config.allowCustomAmount,
            presetAmounts: campaign.donationOptions.map((item) => Number(item.amount)),
          }
        : {
            inputType: config.inputType,
            currency: config.currency,
            unitName: config.unitName,
            unitLabel: config.unitLabel,
            unitPrice: toNumber(config.unitPrice),
            minimumQuantity: config.minimumQuantity,
            maximumQuantity: config.maximumQuantity,
            quantityStep: config.quantityStep,
          };
    return {
      data: {
        ...card,
        description: campaign.description,
        acceptingDonations: true,
        donationConfig,
        paymentMethods: campaign.paymentMethods.map(({ paymentMethod }) => ({
          code: paymentMethod.code,
          name: paymentMethod.name,
          type: paymentMethod.type,
          minimumAmount: toNumber(paymentMethod.minimumAmount),
          maximumAmount: toNumber(paymentMethod.maximumAmount),
        })),
      },
    };
  }

  private async card(campaign: {
    id: string;
    slug: string;
    title: string;
    shortDescription: string;
    coverImageUrl: string;
    category: { code: string; name: string };
    donationConfig: { inputType: string } | null;
    targetMetric: string | null;
    targetAmount: bigint | null;
    targetQuantity: number | null;
    endsAt: Date | null;
    isFeatured: boolean;
  }) {
    const stats = await this.prisma.donation.aggregate({
      where: { campaignId: campaign.id, status: DonationStatus.PAID },
      _sum: { baseAmount: true, quantity: true },
      _count: { id: true },
    });
    const collectedAmount = Number(stats._sum.baseAmount ?? 0);
    const collectedQuantity = stats._sum.quantity ?? 0;
    const targetValue =
      campaign.targetMetric === 'QUANTITY'
        ? campaign.targetQuantity
        : toNumber(campaign.targetAmount);
    const collected =
      campaign.targetMetric === 'QUANTITY' ? collectedQuantity : collectedAmount;
    const percentage =
      targetValue && targetValue > 0
        ? Math.round((collected / targetValue) * 10_000) / 100
        : 0;
    return {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      shortDescription: campaign.shortDescription,
      coverImageUrl: campaign.coverImageUrl,
      category: {
        code: campaign.category.code,
        name: campaign.category.name,
      },
      inputType: campaign.donationConfig?.inputType,
      target: campaign.targetMetric
        ? { metric: campaign.targetMetric, value: targetValue }
        : null,
      progress: {
        collectedAmount,
        collectedQuantity:
          campaign.donationConfig?.inputType === 'QUANTITY'
            ? collectedQuantity
            : null,
        percentage,
        paidDonationCount: stats._count.id,
      },
      endsAt: campaign.endsAt,
      daysRemaining: campaign.endsAt
        ? Math.max(
            0,
            Math.ceil((campaign.endsAt.getTime() - Date.now()) / 86_400_000),
          )
        : null,
      isFeatured: campaign.isFeatured,
    };
  }
}
