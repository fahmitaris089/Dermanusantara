import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Nilai uang disimpan sebagai PostgreSQL BIGINT. Seluruh nominal aplikasi masih
// berada dalam batas aman Number JavaScript dan kontrak API menggunakan integer,
// sehingga serializer global ini juga mencakup relasi Prisma yang bertingkat.
Object.defineProperty(BigInt.prototype, 'toJSON', {
  value() {
    return Number(this);
  },
  configurable: true,
});
import { join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.useStaticAssets(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001').split(','),
    credentials: true,
  });
  app.use((request: { requestId?: string }, response: unknown, next: () => void) => {
    request.requestId = randomUUID();
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Derma Nusantara Public API')
    .setDescription('Public donation API')
    .setVersion('1.0')
    .addTag('campaigns')
    .addTag('donations')
    .addTag('invoices')
    .addTag('admin-auth')
    .addTag('admin-users')
    .addTag('admin-masters')
    .addTag('admin-campaigns')
    .addTag('admin-donations')
    .addTag('admin-reports')
    .addCookieAuth('admin_access')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-CSRF-Token' }, 'csrf')
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
