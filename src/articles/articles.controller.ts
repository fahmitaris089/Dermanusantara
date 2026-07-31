import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArticleListDto } from './articles.dto';
import { ArticlesService } from './articles.service';

@ApiTags('articles')
@Controller()
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}
  @Get('articles') list(@Query() query: ArticleListDto) { return this.service.publicList(query); }
  @Get('articles/:slug') detail(@Param('slug') slug: string) { return this.service.publicDetail(slug); }
  @Get('article-categories') categories() { return this.service.publicCategories(); }
}
