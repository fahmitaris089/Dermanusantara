import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuthService } from '../admin/admin-auth.service';
import { ReorderHeroSlidesDto, SaveHeroSlideDto } from './hero-slides.dto';

@Injectable()
export class HeroSlidesService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AdminAuthService) {}

  private async get(id: string) {
    const slide = await this.prisma.heroSlide.findUnique({ where: { id } });
    if (!slide) throw new DomainException('NOT_FOUND', 'Hero slider tidak ditemukan.', HttpStatus.NOT_FOUND);
    return slide;
  }

  publicList() {
    return this.prisma.heroSlide.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }).then((data) => ({ data }));
  }

  adminList() {
    return this.prisma.heroSlide.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }).then((data) => ({ data }));
  }

  async create(input: SaveHeroSlideDto, actor: string) {
    const last = await this.prisma.heroSlide.aggregate({ _max: { sortOrder: true } });
    const values = { ...input };
    delete values.expectedUpdatedAt;
    const data = await this.prisma.heroSlide.create({ data: { ...values, mobileImageUrl: values.mobileImageUrl || null, mobileImageAlt: values.mobileImageUrl ? (values.mobileImageAlt || values.desktopImageAlt) : null, linkUrl: values.linkUrl || null, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    await this.auth.audit(actor, 'HERO_SLIDE_CREATED', 'HeroSlide', data.id, null, data);
    return { data };
  }

  async update(id: string, input: SaveHeroSlideDto, actor: string) {
    const before = await this.get(id);
    if (input.expectedUpdatedAt && before.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) throw new DomainException('CONCURRENCY_CONFLICT', 'Slider telah diperbarui pengguna lain. Muat ulang data.', HttpStatus.CONFLICT);
    const values = { ...input };
    delete values.expectedUpdatedAt;
    const data = await this.prisma.heroSlide.update({ where: { id }, data: { ...values, mobileImageUrl: values.mobileImageUrl || null, mobileImageAlt: values.mobileImageUrl ? (values.mobileImageAlt || values.desktopImageAlt) : null, linkUrl: values.linkUrl || null } });
    await this.auth.audit(actor, 'HERO_SLIDE_UPDATED', 'HeroSlide', id, before, data);
    return { data };
  }

  async reorder(input: ReorderHeroSlidesDto, actor: string) {
    const existing = await this.prisma.heroSlide.findMany({ select: { id: true }, orderBy: { sortOrder: 'asc' } });
    if (input.ids.length !== existing.length || new Set(input.ids).size !== existing.length || existing.some(({ id }) => !input.ids.includes(id))) throw new DomainException('VALIDATION_ERROR', 'Daftar urutan harus memuat seluruh slider tepat satu kali.', HttpStatus.BAD_REQUEST);
    await this.prisma.$transaction(input.ids.map((id, sortOrder) => this.prisma.heroSlide.update({ where: { id }, data: { sortOrder } })));
    await this.auth.audit(actor, 'HERO_SLIDES_REORDERED', 'HeroSlide', undefined, null, { ids: input.ids });
    return this.adminList();
  }

  async toggle(id: string, isActive: boolean, actor: string) {
    const before = await this.get(id);
    const data = await this.prisma.heroSlide.update({ where: { id }, data: { isActive } });
    await this.auth.audit(actor, isActive ? 'HERO_SLIDE_ACTIVATED' : 'HERO_SLIDE_DEACTIVATED', 'HeroSlide', id, before, data);
    return { data };
  }

  async remove(id: string, actor: string) {
    const before = await this.get(id);
    await this.prisma.heroSlide.delete({ where: { id } });
    await this.auth.audit(actor, 'HERO_SLIDE_HARD_DELETED', 'HeroSlide', id, before);
    return { data: { success: true } };
  }
}
