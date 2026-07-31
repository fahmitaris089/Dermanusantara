import { Module } from '@nestjs/common';
import { AdminArticleCategoriesController, AdminArticlesController } from './admin-articles.controller';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [ArticlesController, AdminArticlesController, AdminArticleCategoriesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
