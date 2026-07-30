import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
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
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.total).toBe(2);
  });

  it('returns MONEY campaign detail', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/campaigns/orang-tua-asuh')
      .expect(200);
    expect(response.body.data.donationConfig.inputType).toBe('MONEY');
    expect(response.body.data.paymentMethods[0].code).toBe(
      'MANUAL_BANK_TRANSFER',
    );
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
    expect(invoice.body.data.payment.bankName).toBe(
      'Bank Syariah Indonesia',
    );
    expect(invoice.body.data.confirmation.whatsappUrl).toContain(
      'https://wa.me/',
    );
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
