import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Public API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdDonationIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdDonationIds.length) {
      await prisma.donation.deleteMany({
        where: { id: { in: createdDonationIds } },
      });
    }
    await app.close();
  });

  it('lists seeded campaigns and returns pagination metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/campaigns?page=1&limit=12')
      .expect(200);
    expect(response.body.data).toHaveLength(3);
    expect(response.body.meta.total).toBe(3);
  });

  it('returns MONEY campaign detail', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/campaigns/orang-tua-asuh')
      .expect(200);
    expect(response.body.data.donationConfig.inputType).toBe('MONEY');
    expect(response.body.data.paymentMethods[0].code).toBe(
      'MANUAL_BANK_TRANSFER',
    );
    expect(response.body.data.paymentMethods).toHaveLength(1);
    expect(response.body.data.progress.collectedAmount).toBe(120_500_000);
    expect(response.body.data.progress.paidDonationCount).toBe(1204);
    expect(response.body.data.story).toHaveLength(3);
    expect(response.body.data.highlights).toHaveLength(3);
    expect(response.body.data.updates).toHaveLength(2);
    expect(response.body.data.recentDonors).toHaveLength(2);
  });

  it.each([
    {
      slug: 'sedekah-al-quran',
      inputType: 'QUANTITY',
      collectedAmount: 45_000_000,
      donorCount: 318,
    },
    {
      slug: 'orang-tua-asuh',
      inputType: 'MONEY',
      collectedAmount: 120_500_000,
      donorCount: 1204,
    },
    {
      slug: 'operasional-pondok',
      inputType: 'MONEY',
      collectedAmount: 85_200_000,
      donorCount: 427,
    },
  ])('returns complete seeded detail for $slug', async (expected) => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${expected.slug}`)
      .expect(200);
    expect(response.body.data.donationConfig.inputType).toBe(
      expected.inputType,
    );
    expect(response.body.data.progress.collectedAmount).toBe(
      expected.collectedAmount,
    );
    expect(response.body.data.progress.paidDonationCount).toBe(
      expected.donorCount,
    );
    expect(response.body.data.location).toEqual(expect.any(String));
    expect(response.body.data.coverImageAlt).toEqual(expect.any(String));
    expect(response.body.data.story).toHaveLength(3);
    expect(response.body.data.highlights).toHaveLength(3);
    expect(response.body.data.updates).toHaveLength(2);
    expect(response.body.data.recentDonors).toHaveLength(2);
    expect(response.body.data.paymentMethods.map(
      (method: { code: string }) => method.code,
    )).toEqual(['MANUAL_BANK_TRANSFER']);
  });

  it('creates a QUANTITY donation, replays it idempotently, and gets invoice', async () => {
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { slug: 'sedekah-al-quran' },
    });
    const key = randomUUID();
    const body = {
      campaignId: campaign.id,
      contribution: { quantity: 2 },
      donor: {
        name: 'E2E Donor',
        whatsapp: '081234567890',
        isAnonymous: true,
        message: 'Test donation',
      },
      paymentMethodCode: 'MANUAL_BANK_TRANSFER',
      attribution: { utmSource: 'e2e' },
    };
    const created = await request(app.getHttpServer())
      .post('/api/v1/donations')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    createdDonationIds.push(created.body.data.donationId);
    expect(created.body.data.baseAmount).toBe(50_000);
    expect(created.body.data.payableAmount).toBeGreaterThan(50_000);

    const replay = await request(app.getHttpServer())
      .post('/api/v1/donations')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    expect(replay.body.data.donationId).toBe(created.body.data.donationId);

    const invoice = await request(app.getHttpServer())
      .get(`/api/v1/invoices/${created.body.data.publicId}`)
      .expect(200);
    expect(invoice.body.data.donorDisplayName).toBe('Hamba Allah');
    expect(invoice.body.data.createdAt).toEqual(expect.any(String));
    expect(invoice.body.data.invoiceNumber).toBe(created.body.data.invoiceNumber);
    expect(invoice.body.data.baseAmount).toBe(50_000);
    expect(invoice.body.data.payableAmount).toBe(created.body.data.payableAmount);
    expect(invoice.body.data.payment.accountNumber).toEqual(expect.any(String));
    expect(invoice.body.data.payment.instructions).toEqual(
      expect.arrayContaining([expect.any(String)]),
    );
    expect(invoice.body.data.payment.bankName).toBe(
      'Bank Syariah Indonesia',
    );
    expect(invoice.body.data.confirmation.whatsappUrl).toContain(
      'https://wa.me/',
    );
  });

  it('returns 404 for an unknown invoice public id', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/invoices/inv_not-found')
      .expect(404);

    expect(response.body.error.code).toBe('INVOICE_NOT_FOUND');
  });

  it('rejects amount payload for QUANTITY campaign', async () => {
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { slug: 'sedekah-al-quran' },
    });
    await request(app.getHttpServer())
      .post('/api/v1/donations')
      .set('Idempotency-Key', randomUUID())
      .send({
        campaignId: campaign.id,
        contribution: { amount: 50_000 },
        donor: {
          name: 'E2E Donor',
          whatsapp: '081234567890',
          isAnonymous: false,
        },
        paymentMethodCode: 'MANUAL_BANK_TRANSFER',
      })
      .expect(400);
  });
});
