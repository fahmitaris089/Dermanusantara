import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard, CsrfGuard, Roles, RolesGuard } from '../admin/admin.security';
import type { AdminRequest } from '../admin/admin.types';
import { ReorderTestimonialsDto, SaveTestimonialDto } from './testimonials.dto';
import { TestimonialsService } from './testimonials.service';

@ApiTags('testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly service: TestimonialsService) {}
  @Get() list() { return this.service.publicList(); }
}

@ApiTags('admin-testimonials')
@Controller('admin/testimonials')
@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
export class AdminTestimonialsController {
  constructor(private readonly service: TestimonialsService) {}
  @Get() list() { return this.service.adminList(); }
  @Post() create(@Body() dto: SaveTestimonialDto, @Req() req: AdminRequest) { return this.service.create(dto, req.admin!.id); }
  @Put('reorder') reorder(@Body() dto: ReorderTestimonialsDto, @Req() req: AdminRequest) { return this.service.reorder(dto, req.admin!.id); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: SaveTestimonialDto, @Req() req: AdminRequest) { return this.service.update(id, dto, req.admin!.id); }
  @Patch(':id/activate') activate(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.toggle(id, true, req.admin!.id); }
  @Patch(':id/deactivate') deactivate(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.toggle(id, false, req.admin!.id); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.remove(id, req.admin!.id); }
}
