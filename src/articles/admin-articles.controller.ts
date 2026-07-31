import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminRole, ArticleStatus } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard, CsrfGuard, Roles, RolesGuard } from '../admin/admin.security';
import type { AdminRequest } from '../admin/admin.types';
import { ArticleListDto, ConcurrencyDto, PublishArticleDto, SaveArticleCategoryDto, SaveArticleDto } from './articles.dto';
import { ArticlesService } from './articles.service';

@ApiTags('admin-articles')
@Controller('admin/articles')
@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
export class AdminArticlesController {
  constructor(private readonly service: ArticlesService) {}
  @Get() list(@Query() query: ArticleListDto) { return this.service.adminList(query); }
  @Get(':id') get(@Param('id') id: string) { return this.service.adminGet(id); }
  @Post() create(@Body() dto: SaveArticleDto, @Req() req: AdminRequest) { return this.service.create(dto, req.admin!.id); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: SaveArticleDto, @Req() req: AdminRequest) { return this.service.update(id, dto, req.admin!.id); }
  @Post(':id/publish') publish(@Param('id') id: string, @Body() dto: PublishArticleDto, @Req() req: AdminRequest) { return this.service.publish(id, dto, req.admin!.id); }
  @Post(':id/archive') archive(@Param('id') id: string, @Body() dto: ConcurrencyDto, @Req() req: AdminRequest) { return this.service.status(id, ArticleStatus.ARCHIVED, dto, req.admin!.id); }
  @Post(':id/restore-draft') restore(@Param('id') id: string, @Body() dto: ConcurrencyDto, @Req() req: AdminRequest) { return this.service.status(id, ArticleStatus.DRAFT, dto, req.admin!.id); }
  @Delete(':id') remove(@Param('id') id: string, @Body() dto: ConcurrencyDto, @Req() req: AdminRequest) { return this.service.remove(id, dto, req.admin!.id); }
}

@ApiTags('admin-article-categories')
@Controller('admin/article-categories')
@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
export class AdminArticleCategoriesController {
  constructor(private readonly service: ArticlesService) {}
  @Get() list() { return this.service.categories(true); }
  @Post() create(@Body() dto: SaveArticleCategoryDto, @Req() req: AdminRequest) { return this.service.createCategory(dto, req.admin!.id); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: SaveArticleCategoryDto, @Req() req: AdminRequest) { return this.service.updateCategory(id, dto, req.admin!.id); }
  @Patch(':id/activate') activate(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.toggleCategory(id, true, req.admin!.id); }
  @Patch(':id/deactivate') deactivate(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.toggleCategory(id, false, req.admin!.id); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: AdminRequest) { return this.service.removeCategory(id, req.admin!.id); }
}
