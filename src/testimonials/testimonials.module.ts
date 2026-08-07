import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AdminTestimonialsController, TestimonialsController } from './testimonials.controller';
import { TestimonialsService } from './testimonials.service';

@Module({
  imports: [AdminModule],
  controllers: [TestimonialsController, AdminTestimonialsController],
  providers: [TestimonialsService],
})
export class TestimonialsModule {}
