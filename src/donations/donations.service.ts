import {
  createHash,
  randomBytes,
  randomInt,
} from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CampaignStatus,
  ContributionInputType,
  DonationStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/domain.exception';
import { CreateDonationDto } from './dto/create-donation.dto';

const donationReadInclude = {
  payments: {
    include: { paymentMethod: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.DonationInclude;

type DonationRead = Prisma.DonationGetPayload<{
  include: typeof donationReadInclude;
}>;

@Injectable()
export class DonationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateDonationDto,
    idempotencyKey: string | undefined,
    request: Request,
  ) {
    if (
      !idempotencyKey ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'Header Idempotency-Key wajib berupa UUID.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const requestHash = this.hash(input);
    const existing = await this.findIdempotent(idempotencyKey);
    if (existing) return this.replayOrConflict(existing, requestHash);

    const now = new Date();
    await this.expirePastDue(now);
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: input.campaignId,
        status: CampaignStatus.PUBLISHED,
        acceptingDonations: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      include: {
        donationConfig: true,
        donationOptions: { where: { isActive: true } },
        paymentMethods: {
          where: {
            isActive: true,
            paymentMethod: {
              isActive: true,
              code: input.paymentMethodCode,
            },
          },
          include: { paymentMethod: true },
        },
      },
    });
    if (!campaign?.donationConfig) {
      throw new DomainException(
        'CAMPAIGN_NOT_ACCEPTING_DONATIONS',
        'Campaign tidak menerima donasi.',
        HttpStatus.CONFLICT,
      );
    }
    const paymentMethod = campaign.paymentMethods[0]?.paymentMethod;
    if (!paymentMethod) {
      throw new DomainException(
        'PAYMENT_METHOD_NOT_AVAILABLE',
        'Metode pembayaran tidak tersedia untuk campaign.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const calculation = this.calculate(campaign, input);
    if (
      paymentMethod.minimumAmount !== null &&
      calculation.baseAmount < paymentMethod.minimumAmount
    ) {
      throw new DomainException(
        'AMOUNT_BELOW_MINIMUM',
        'Nominal donasi berada di bawah minimum metode pembayaran.',
        HttpStatus.BAD_REQUEST,
        { minimumAmount: Number(paymentMethod.minimumAmount) },
      );
    }
    if (
      paymentMethod.maximumAmount !== null &&
      calculation.baseAmount > paymentMethod.maximumAmount
    ) {
      throw new DomainException(
        'AMOUNT_ABOVE_MAXIMUM',
        'Nominal donasi berada di atas maksimum metode pembayaran.',
        HttpStatus.BAD_REQUEST,
        { maximumAmount: Number(paymentMethod.maximumAmount) },
      );
    }
    const donorWhatsapp = this.normalizeWhatsapp(input.donor.whatsapp);
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    if (!bankAccount) {
      throw new DomainException(
        'PAYMENT_METHOD_NOT_AVAILABLE',
        'Rekening tujuan aktif tidak tersedia.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const expiresAt = new Date(
      now.getTime() + paymentMethod.expiryMinutes * 60_000,
    );

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const uniqueCode = paymentMethod.uniqueCodeEnabled
        ? randomInt(
            Number(process.env.UNIQUE_CODE_MIN ?? 1),
            Number(process.env.UNIQUE_CODE_MAX ?? 999) + 1,
          )
        : 0;
      const payableAmount = calculation.baseAmount + BigInt(uniqueCode);
      try {
        const donation = await this.prisma.$transaction(
          async (tx) => {
            const created = await tx.donation.create({
              data: {
                publicId: `inv_${randomBytes(12).toString('base64url')}`,
                invoiceNumber: this.invoiceNumber(),
                campaignId: campaign.id,
                campaignTitleSnapshot: campaign.title,
                campaignSlugSnapshot: campaign.slug,
                inputTypeSnapshot: campaign.donationConfig!.inputType,
                quantity: calculation.quantity,
                unitNameSnapshot: campaign.donationConfig!.unitName,
                unitLabelSnapshot: campaign.donationConfig!.unitLabel,
                unitPriceSnapshot: campaign.donationConfig!.unitPrice,
                baseAmount: calculation.baseAmount,
                currency: campaign.donationConfig!.currency,
                donorName: input.donor.name.trim(),
                donorWhatsapp,
                isAnonymous: input.donor.isAnonymous,
                publicMessage: input.donor.message?.trim() || null,
                status: DonationStatus.PENDING_PAYMENT,
                expiresAt,
                ipAddress: this.clientIp(request),
                userAgent: request.get('user-agent')?.slice(0, 1000),
                referrer: request.get('referer')?.slice(0, 2000),
                acceptLanguage: request.get('accept-language')?.slice(0, 200),
                utmSource: input.attribution?.utmSource,
                utmMedium: input.attribution?.utmMedium,
                utmCampaign: input.attribution?.utmCampaign,
                utmContent: input.attribution?.utmContent,
                utmTerm: input.attribution?.utmTerm,
                payments: {
                  create: {
                    paymentMethodId: paymentMethod.id,
                    bankAccountId: bankAccount.id,
                    provider: 'MANUAL',
                    baseAmount: calculation.baseAmount,
                    uniqueCode,
                    payableAmount,
                    activeUniqueKey: `${bankAccount.id}:${payableAmount}`,
                    currency: campaign.donationConfig!.currency,
                    bankNameSnapshot: bankAccount.bankName,
                    accountNumberSnapshot: bankAccount.accountNumber,
                    accountHolderSnapshot: bankAccount.accountHolderName,
                    instructionsSnapshot:
                      bankAccount.instructions as Prisma.InputJsonValue,
                    expiresAt,
                  },
                },
                statusHistories: {
                  create: {
                    toStatus: DonationStatus.PENDING_PAYMENT,
                    reason: 'Donation created',
                  },
                },
              },
              include: donationReadInclude,
            });
            await tx.idempotencyRecord.create({
              data: {
                key: idempotencyKey,
                requestHash,
                donationId: created.id,
              },
            });
            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return { data: this.createdResponse(donation) };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')
        ) {
          const idempotent = await this.findIdempotent(idempotencyKey);
          if (idempotent) return this.replayOrConflict(idempotent, requestHash);
          continue;
        }
        throw error;
      }
    }
    throw new DomainException(
      'INTERNAL_ERROR',
      'Kode unik pembayaran tidak tersedia. Silakan coba lagi.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private calculate(
    campaign: Prisma.CampaignGetPayload<{
      include: {
        donationConfig: true;
        donationOptions: true;
        paymentMethods: {
          include: { paymentMethod: true };
        };
      };
    }>,
    input: CreateDonationDto,
  ) {
    const config = campaign.donationConfig!;
    if (config.inputType === ContributionInputType.MONEY) {
      if (
        input.contribution.amount === undefined ||
        input.contribution.quantity !== undefined
      ) {
        throw new DomainException(
          'INVALID_CONTRIBUTION_TYPE',
          'Campaign ini hanya menerima kontribusi berupa nominal.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const amount = BigInt(input.contribution.amount);
      if (config.minimumAmount !== null && amount < config.minimumAmount) {
        throw new DomainException(
          'AMOUNT_BELOW_MINIMUM',
          'Nominal donasi berada di bawah minimum campaign.',
          HttpStatus.BAD_REQUEST,
          { minimumAmount: Number(config.minimumAmount) },
        );
      }
      if (config.maximumAmount !== null && amount > config.maximumAmount) {
        throw new DomainException(
          'AMOUNT_ABOVE_MAXIMUM',
          'Nominal donasi berada di atas maksimum campaign.',
          HttpStatus.BAD_REQUEST,
          { maximumAmount: Number(config.maximumAmount) },
        );
      }
      const isPreset = campaign.donationOptions.some(
        (option) => option.amount === amount,
      );
      if (!config.allowCustomAmount && !isPreset) {
        throw new DomainException(
          'CUSTOM_AMOUNT_NOT_ALLOWED',
          'Campaign hanya menerima nominal preset.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return { baseAmount: amount, quantity: null };
    }

    if (
      input.contribution.quantity === undefined ||
      input.contribution.amount !== undefined
    ) {
      throw new DomainException(
        'INVALID_CONTRIBUTION_TYPE',
        'Campaign ini hanya menerima kontribusi berupa kuantitas.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const quantity = input.contribution.quantity;
    if (
      config.minimumQuantity !== null &&
      quantity < config.minimumQuantity
    ) {
      throw new DomainException(
        'QUANTITY_BELOW_MINIMUM',
        'Kuantitas berada di bawah minimum campaign.',
        HttpStatus.BAD_REQUEST,
        { minimumQuantity: config.minimumQuantity },
      );
    }
    if (
      config.maximumQuantity !== null &&
      quantity > config.maximumQuantity
    ) {
      throw new DomainException(
        'QUANTITY_ABOVE_MAXIMUM',
        'Kuantitas berada di atas maksimum campaign.',
        HttpStatus.BAD_REQUEST,
        { maximumQuantity: config.maximumQuantity },
      );
    }
    const minimum = config.minimumQuantity ?? 1;
    const step = config.quantityStep ?? 1;
    if ((quantity - minimum) % step !== 0) {
      throw new DomainException(
        'INVALID_QUANTITY_STEP',
        'Kuantitas tidak sesuai kelipatan yang diizinkan.',
        HttpStatus.BAD_REQUEST,
        { quantityStep: step },
      );
    }
    if (config.unitPrice === null) {
      throw new DomainException(
        'INTERNAL_ERROR',
        'Harga unit campaign belum dikonfigurasi.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      baseAmount: BigInt(quantity) * config.unitPrice,
      quantity,
    };
  }

  private normalizeWhatsapp(raw: string) {
    let value = raw.replace(/[^\d+]/g, '');
    if (value.startsWith('+')) value = value.slice(1);
    if (value.startsWith('0')) value = `62${value.slice(1)}`;
    if (!/^[1-9]\d{8,14}$/.test(value)) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'Nomor WhatsApp tidak valid.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  private clientIp(request: Request) {
    return request.ip?.slice(0, 64) || null;
  }

  private async expirePastDue(now: Date) {
    await this.prisma.$transaction([
      this.prisma.payment.updateMany({
        where: {
          status: PaymentStatus.PENDING,
          expiresAt: { lte: now },
        },
        data: {
          status: PaymentStatus.EXPIRED,
          activeUniqueKey: null,
        },
      }),
      this.prisma.donation.updateMany({
        where: {
          status: DonationStatus.PENDING_PAYMENT,
          expiresAt: { lte: now },
        },
        data: { status: DonationStatus.EXPIRED },
      }),
    ]);
  }

  private hash(value: unknown) {
    const stable = JSON.stringify(value, (_key, item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return Object.keys(item)
          .sort()
          .reduce<Record<string, unknown>>((result, key) => {
            result[key] = (item as Record<string, unknown>)[key];
            return result;
          }, {});
      }
      return item;
    });
    return createHash('sha256').update(stable).digest('hex');
  }

  private invoiceNumber() {
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date())
      .replaceAll('-', '');
    return `INV-${date}-${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  private async findIdempotent(key: string) {
    return this.prisma.idempotencyRecord.findUnique({
      where: { key },
      include: {
        donation: { include: donationReadInclude },
      },
    });
  }

  private replayOrConflict(
    record: NonNullable<Awaited<ReturnType<DonationsService['findIdempotent']>>>,
    hash: string,
  ) {
    if (record.requestHash !== hash) {
      throw new DomainException(
        'IDEMPOTENCY_CONFLICT',
        'Idempotency-Key telah digunakan dengan payload berbeda.',
        HttpStatus.CONFLICT,
      );
    }
    return { data: this.createdResponse(record.donation) };
  }

  private createdResponse(donation: DonationRead) {
    const payment = donation.payments[0];
    return {
      donationId: donation.id,
      invoiceNumber: donation.invoiceNumber,
      publicId: donation.publicId,
      status: donation.status,
      contribution: {
        inputType: donation.inputTypeSnapshot,
        ...(donation.inputTypeSnapshot === 'QUANTITY'
          ? {
              quantity: donation.quantity,
              unitName: donation.unitNameSnapshot,
              unitLabel: donation.unitLabelSnapshot,
              unitPrice: Number(donation.unitPriceSnapshot),
            }
          : { amount: Number(donation.baseAmount) }),
      },
      baseAmount: Number(donation.baseAmount),
      uniqueCode: payment.uniqueCode,
      payableAmount: Number(payment.payableAmount),
      currency: donation.currency,
      expiresAt: donation.expiresAt,
      invoiceUrl: `/donasi/invoice/${donation.publicId}`,
    };
  }
}
