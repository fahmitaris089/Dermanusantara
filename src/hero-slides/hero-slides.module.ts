import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AdminHeroSlidesController, HeroSlidesController } from './hero-slides.controller';
import { HeroSlidesService } from './hero-slides.service';

@Module({
  imports: [AdminModule],
  controllers: [HeroSlidesController, AdminHeroSlidesController],
  providers: [HeroSlidesService],
})
export class HeroSlidesModule {}
