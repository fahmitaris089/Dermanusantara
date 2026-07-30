import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let csrf = '';
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
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
    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in seeded super admin and sets protected cookies', async () => {
    const response = await agent
      .post('/api/v1/admin/auth/login')
      .send({
        email: process.env.ADMIN_SEED_EMAIL ?? 'admin@dermanusantara.local',
        password: process.env.ADMIN_SEED_PASSWORD ?? 'AdminLocal123!',
      })
      .expect(201);
    expect(response.body.data.role).toBe('SUPER_ADMIN');
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('admin_access=');
    expect(cookies.join(';')).toContain('HttpOnly');
    csrf = decodeURIComponent(
      cookies
        .find((cookie) => cookie.startsWith('admin_csrf='))!
        .split(';')[0]
        .split('=')[1],
    );
  });

  it('returns current admin and permissions', async () => {
    const response = await agent.get('/api/v1/admin/auth/me').expect(200);
    expect(response.body.data.permissions).toContain('*');
  });

  it('rejects mutation without csrf', async () => {
    const response = await agent
      .post('/api/v1/admin/campaign-categories')
      .send({ code: 'E2E_NO_CSRF', name: 'No CSRF' })
      .expect(403);
    expect(response.body.error.code).toBe('CSRF_INVALID');
  });

  it('creates, reads, and deletes an unused category with audit trail', async () => {
    const code = `E2E_${Date.now()}`;
    const created = await agent
      .post('/api/v1/admin/campaign-categories')
      .set('X-CSRF-Token', csrf)
      .send({ code, name: 'Kategori E2E' })
      .expect(201);
    const id = created.body.data.id as string;
    await agent.get(`/api/v1/admin/campaign-categories/${id}`).expect(200);
    await agent
      .delete(`/api/v1/admin/campaign-categories/${id}`)
      .set('X-CSRF-Token', csrf)
      .expect(200);
    expect(
      await prisma.auditLog.count({
        where: { entityType: 'CampaignCategory', entityId: id },
      }),
    ).toBeGreaterThanOrEqual(2);
  });

  it('returns dashboard, reports, and CSV export', async () => {
    await agent.get('/api/v1/admin/dashboard/summary').expect(200);
    await agent.get('/api/v1/admin/reports/campaigns').expect(200);
    const exportResponse = await agent
      .get('/api/v1/admin/reports/campaigns/export?format=csv')
      .expect(200);
    expect(exportResponse.headers['content-type']).toContain('text/csv');
  });

  it('logs out and rejects the previous access session', async () => {
    await agent
      .post('/api/v1/admin/auth/logout')
      .set('X-CSRF-Token', csrf)
      .expect(201);
    await agent.get('/api/v1/admin/auth/me').expect(401);
  });
});
