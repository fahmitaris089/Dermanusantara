import { HttpStatus, Injectable } from '@nestjs/common';
import { AdminAuthService } from '../admin/admin-auth.service';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderTestimonialsDto, SaveTestimonialDto } from './testimonials.dto';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AdminAuthService) {}

  private async get(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) throw new DomainException('NOT_FOUND', 'Testimoni tidak ditemukan.', HttpStatus.NOT_FOUND);
    return testimonial;
  }

  async publicList() {
    const data = await this.prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 3,
    });
    return { data: data.map((item) => ({ ...item, role: item.role?.trim() || 'Donatur' })) };
  }

  adminList() {
    return this.prisma.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }).then((data) => ({ data }));
  }

  async create(input: SaveTestimonialDto, actor: string) {
    const last = await this.prisma.testimonial.aggregate({ _max: { sortOrder: true } });
    const values = { ...input };
    delete values.expectedUpdatedAt;
    const data = await this.prisma.testimonial.create({
      data: {
        ...values,
        name: values.name.trim(),
        quote: values.quote.trim(),
        role: values.role?.trim() || null,
        photoUrl: values.photoUrl?.trim() || null,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    await this.auth.audit(actor, 'TESTIMONIAL_CREATED', 'Testimonial', data.id, null, data);
    return { data };
  }

  async update(id: string, input: SaveTestimonialDto, actor: string) {
    const before = await this.get(id);
    if (input.expectedUpdatedAt && before.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) {
      throw new DomainException('CONCURRENCY_CONFLICT', 'Testimoni telah diperbarui pengguna lain. Muat ulang data.', HttpStatus.CONFLICT);
    }
    const values = { ...input };
    delete values.expectedUpdatedAt;
    const data = await this.prisma.testimonial.update({
      where: { id },
      data: {
        ...values,
        name: values.name.trim(),
        quote: values.quote.trim(),
        role: values.role?.trim() || null,
        photoUrl: values.photoUrl?.trim() || null,
      },
    });
    await this.auth.audit(actor, 'TESTIMONIAL_UPDATED', 'Testimonial', id, before, data);
    return { data };
  }

  async reorder(input: ReorderTestimonialsDto, actor: string) {
    const existing = await this.prisma.testimonial.findMany({ select: { id: true }, orderBy: { sortOrder: 'asc' } });
    if (input.ids.length !== existing.length || new Set(input.ids).size !== existing.length || existing.some(({ id }) => !input.ids.includes(id))) {
      throw new DomainException('VALIDATION_ERROR', 'Daftar urutan harus memuat seluruh testimoni tepat satu kali.', HttpStatus.BAD_REQUEST);
    }
    await this.prisma.$transaction(input.ids.map((id, sortOrder) => this.prisma.testimonial.update({ where: { id }, data: { sortOrder } })));
    await this.auth.audit(actor, 'TESTIMONIALS_REORDERED', 'Testimonial', undefined, null, { ids: input.ids });
    return this.adminList();
  }

  async toggle(id: string, isActive: boolean, actor: string) {
    const before = await this.get(id);
    const data = await this.prisma.testimonial.update({ where: { id }, data: { isActive } });
    await this.auth.audit(actor, isActive ? 'TESTIMONIAL_ACTIVATED' : 'TESTIMONIAL_DEACTIVATED', 'Testimonial', id, before, data);
    return { data };
  }

  async remove(id: string, actor: string) {
    const before = await this.get(id);
    await this.prisma.testimonial.delete({ where: { id } });
    await this.auth.audit(actor, 'TESTIMONIAL_HARD_DELETED', 'Testimonial', id, before);
    return { data: { success: true } };
  }
}
