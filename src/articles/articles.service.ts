import { HttpStatus, Injectable } from '@nestjs/common';
import { ArticleStatus, Prisma } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuthService } from '../admin/admin-auth.service';
import { ArticleListDto, ConcurrencyDto, PublishArticleDto, SaveArticleCategoryDto, SaveArticleDto } from './articles.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AdminAuthService) {}

  private publicWhere(category?: string): Prisma.ArticleWhereInput {
    return { status: ArticleStatus.PUBLISHED, publishedAt: { lte: new Date() }, ...(category ? { category: { code: category, isActive: true } } : {}) };
  }
  private serialize<T extends { disbursedAmount?: bigint | null; ctaStartingAmount?: bigint | null }>(row: T) {
    return { ...row, disbursedAmount: row.disbursedAmount == null ? null : Number(row.disbursedAmount), ctaStartingAmount: row.ctaStartingAmount == null ? null : Number(row.ctaStartingAmount) };
  }
  private seo(article: any) {
    const base = (process.env.WEBSITE_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    return { title: article.seoTitle || article.title, description: article.seoDescription || article.excerpt, canonicalUrl: `${base}/berita/${article.slug}`, ogImageUrl: article.ogImageUrl || article.coverImageUrl };
  }
  private async article(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id }, include: { category: true } });
    if (!article) throw new DomainException('NOT_FOUND', 'Artikel tidak ditemukan.', HttpStatus.NOT_FOUND);
    return article;
  }
  private concurrency(current: Date, expected?: string) {
    if (expected && current.getTime() !== new Date(expected).getTime()) throw new DomainException('CONCURRENCY_CONFLICT', 'Artikel telah diperbarui pengguna lain. Muat ulang data.', HttpStatus.CONFLICT);
  }
  private validateBlocks(content: SaveArticleDto['content']) {
    for (const block of content) {
      if (['paragraph', 'heading', 'quote'].includes(block.type) && !block.text?.trim()) throw new DomainException('VALIDATION_ERROR', `Teks blok ${block.type} wajib diisi.`, HttpStatus.BAD_REQUEST);
      if (block.type === 'heading' && ![2, 3].includes(block.level ?? 0)) throw new DomainException('VALIDATION_ERROR', 'Heading hanya mendukung level 2 atau 3.', HttpStatus.BAD_REQUEST);
      if (block.type === 'image' && (!block.url || !block.alt?.trim())) throw new DomainException('VALIDATION_ERROR', 'URL dan alt gambar blok wajib diisi.', HttpStatus.BAD_REQUEST);
    }
  }
  private input(dto: SaveArticleDto) {
    this.validateBlocks(dto.content);
    const { expectedUpdatedAt: _expected, ...rest } = dto;
    return { ...rest, content: rest.content as unknown as Prisma.InputJsonValue, disbursedAmount: rest.disbursedAmount == null ? null : BigInt(rest.disbursedAmount), ctaStartingAmount: rest.ctaStartingAmount == null ? null : BigInt(rest.ctaStartingAmount) };
  }
  async publicList(query: ArticleListDto) {
    const where = this.publicWhere(query.category);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({ where, include: { category: true }, orderBy: { publishedAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.article.count({ where }),
    ]);
    return { data: rows.map((row) => this.serialize(row)), meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
  async publicDetail(slug: string) {
    const article = await this.prisma.article.findFirst({ where: { slug, ...this.publicWhere() }, include: { category: true } });
    if (!article) throw new DomainException('NOT_FOUND', 'Artikel tidak ditemukan.', HttpStatus.NOT_FOUND);
    const related = await this.prisma.article.findMany({ where: { ...this.publicWhere(), categoryId: article.categoryId, id: { not: article.id } }, include: { category: true }, orderBy: { publishedAt: 'desc' }, take: 3 });
    return { data: { ...this.serialize(article), seo: this.seo(article), relatedArticles: related.map((row) => this.serialize(row)) } };
  }
  async publicCategories() {
    const data = await this.prisma.articleCategory.findMany({ where: { isActive: true, articles: { some: this.publicWhere() } }, orderBy: { name: 'asc' } });
    return { data };
  }
  async adminList(query: ArticleListDto) {
    const where: Prisma.ArticleWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.category ? { categoryId: query.category } : {}), ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { slug: { contains: query.search, mode: 'insensitive' } }] } : {}) };
    const [rows, total] = await this.prisma.$transaction([this.prisma.article.findMany({ where, include: { category: true }, orderBy: { updatedAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }), this.prisma.article.count({ where })]);
    return { data: rows.map((row) => this.serialize(row)), meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
  async adminGet(id: string) { return { data: this.serialize(await this.article(id)) }; }
  async create(dto: SaveArticleDto, actor: string) {
    const data = await this.prisma.article.create({ data: this.input(dto), include: { category: true } });
    await this.auth.audit(actor, 'ARTICLE_CREATED', 'Article', data.id, null, { slug: data.slug, status: data.status });
    return { data: this.serialize(data) };
  }
  async update(id: string, dto: SaveArticleDto, actor: string) {
    const before = await this.article(id); this.concurrency(before.updatedAt, dto.expectedUpdatedAt);
    const data = await this.prisma.article.update({ where: { id }, data: this.input(dto), include: { category: true } });
    await this.auth.audit(actor, 'ARTICLE_UPDATED', 'Article', id, { slug: before.slug, status: before.status }, { slug: data.slug, status: data.status });
    return { data: this.serialize(data) };
  }
  async publish(id: string, dto: PublishArticleDto, actor: string) {
    const before = await this.article(id); this.concurrency(before.updatedAt, dto.expectedUpdatedAt);
    const category = await this.prisma.articleCategory.findUnique({ where: { id: before.categoryId } });
    if (!category?.isActive || !Array.isArray(before.content) || !(before.content as any[]).some((b) => b.type === 'paragraph' && b.text?.trim())) throw new DomainException('VALIDATION_ERROR', 'Artikel harus memakai kategori aktif dan memiliki minimal satu paragraf.', HttpStatus.BAD_REQUEST);
    const data = await this.prisma.article.update({ where: { id }, data: { status: ArticleStatus.PUBLISHED, publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date() }, include: { category: true } });
    await this.auth.audit(actor, 'ARTICLE_PUBLISHED', 'Article', id, { status: before.status }, { status: data.status, publishedAt: data.publishedAt });
    return { data: this.serialize(data) };
  }
  async status(id: string, status: ArticleStatus, dto: ConcurrencyDto, actor: string) {
    const before = await this.article(id); this.concurrency(before.updatedAt, dto.expectedUpdatedAt);
    const data = await this.prisma.article.update({ where: { id }, data: { status }, include: { category: true } });
    await this.auth.audit(actor, status === ArticleStatus.ARCHIVED ? 'ARTICLE_ARCHIVED' : 'ARTICLE_RESTORED_DRAFT', 'Article', id);
    return { data: this.serialize(data) };
  }
  async remove(id: string, dto: ConcurrencyDto, actor: string) {
    const before = await this.article(id); this.concurrency(before.updatedAt, dto.expectedUpdatedAt);
    await this.prisma.article.delete({ where: { id } });
    await this.auth.audit(actor, 'ARTICLE_HARD_DELETED', 'Article', id, {
      slug: before.slug,
      title: before.title,
      status: before.status,
      publishedAt: before.publishedAt,
    });
    return { data: { success: true } };
  }
  async categories(admin = false) { return { data: await this.prisma.articleCategory.findMany({ where: admin ? {} : { isActive: true }, include: admin ? { _count: { select: { articles: true } } } : undefined, orderBy: { name: 'asc' } }) }; }
  async createCategory(dto: SaveArticleCategoryDto, actor: string) { const data = await this.prisma.articleCategory.create({ data: dto }); await this.auth.audit(actor, 'ARTICLE_CATEGORY_CREATED', 'ArticleCategory', data.id); return { data }; }
  async updateCategory(id: string, dto: SaveArticleCategoryDto, actor: string) { const data = await this.prisma.articleCategory.update({ where: { id }, data: dto }); await this.auth.audit(actor, 'ARTICLE_CATEGORY_UPDATED', 'ArticleCategory', id); return { data }; }
  async toggleCategory(id: string, active: boolean, actor: string) { const data = await this.prisma.articleCategory.update({ where: { id }, data: { isActive: active } }); await this.auth.audit(actor, active ? 'ARTICLE_CATEGORY_ACTIVATED' : 'ARTICLE_CATEGORY_DEACTIVATED', 'ArticleCategory', id); return { data }; }
  async removeCategory(id: string, actor: string) { if (await this.prisma.article.count({ where: { categoryId: id } })) throw new DomainException('RESOURCE_IN_USE', 'Kategori masih digunakan artikel.', HttpStatus.CONFLICT); await this.prisma.articleCategory.delete({ where: { id } }); await this.auth.audit(actor, 'ARTICLE_CATEGORY_DELETED', 'ArticleCategory', id); return { data: { success: true } }; }
}
