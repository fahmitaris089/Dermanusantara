import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DonationsModule } from './donations/donations.module';
import { InvoicesModule } from './invoices/invoices.module';
import { HealthController } from './health.controller';
import { AdminModule } from './admin/admin.module';
import { ArticlesModule } from './articles/articles.module';
import { HeroSlidesModule } from './hero-slides/hero-slides.module';
import { TestimonialsModule } from './testimonials/testimonials.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    CampaignsModule,
    DonationsModule,
    InvoicesModule,
    AdminModule,
    ArticlesModule,
    HeroSlidesModule,
    TestimonialsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
