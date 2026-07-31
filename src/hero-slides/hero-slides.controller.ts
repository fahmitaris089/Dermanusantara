import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard, CsrfGuard, Roles, RolesGuard } from '../admin/admin.security';
import type { AdminRequest } from '../admin/admin.types';
import { ReorderHeroSlidesDto, SaveHeroSlideDto } from './hero-slides.dto';
import { HeroSlidesService } from './hero-slides.service';

@ApiTags('hero-slides')
@Controller('hero-slides')
export class HeroSlidesController {
  constructor(private readonly service: HeroSlidesService) {}
  @Get() list() { return this.service.publicList(); }
}

@ApiTags('admin-hero-slides')
@Controller('admin/hero-slides')
@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
export class AdminHeroSlidesController {
  constructor(private readonly service: HeroSlidesService) {}
  @Get() list() { return this.service.adminList(); }
  @Post() create(@Body() dto: SaveHeroSlideDto, @Req() req: AdminRequest) { return this.service.create(dto, req.admin!.id); }
  @Put('reorder') reorder(@Body() dto: ReorderHeroSlidesDto, @Req() req: AdminRequest) { return this.service.reorder(dto, req.admin!.id); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: SaveHeroSlideDto, @Req() req: AdminRequest) { return this.service.update(id, dto, req.admin!.id); }
  @Patch(':id/activate') activate(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.toggle(id, true, req.admin!.id); }
  @Patch(':id/deactivate') deactivate(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.toggle(id, false, req.admin!.id); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.remove(id, req.admin!.id); }
}
