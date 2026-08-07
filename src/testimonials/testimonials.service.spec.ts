import { HttpStatus } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';

describe('TestimonialsService', () => {
  const prisma = {
    testimonial: {
      findMany: jest.fn(), findUnique: jest.fn(), aggregate: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const auth = { audit: jest.fn() };
  const service = new TestimonialsService(prisma as never, auth as never);

  beforeEach(() => jest.clearAllMocks());

  it('public hanya meminta tiga testimoni aktif dan memberi fallback peran', async () => {
    prisma.testimonial.findMany.mockResolvedValue([{ id: 'a', name: 'A', role: null, quote: 'Baik' }]);
    await expect(service.publicList()).resolves.toEqual({ data: [{ id: 'a', name: 'A', role: 'Donatur', quote: 'Baik' }] });
    expect(prisma.testimonial.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 3 });
  });

  it('menolak update dari snapshot kedaluwarsa', async () => {
    prisma.testimonial.findUnique.mockResolvedValue({ id: 'a', updatedAt: new Date('2026-08-07T10:00:00Z') });
    await expect(service.update('a', { name: 'A', quote: 'Baik', expectedUpdatedAt: '2026-08-07T09:00:00Z' }, 'admin')).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    expect(prisma.testimonial.update).not.toHaveBeenCalled();
  });

  it('reorder wajib memuat semua id sekali', async () => {
    prisma.testimonial.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(service.reorder({ ids: ['a', 'a'] }, 'admin')).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('menghapus permanen dan mencatat audit', async () => {
    const before = { id: 'a', updatedAt: new Date() };
    prisma.testimonial.findUnique.mockResolvedValue(before);
    prisma.testimonial.delete.mockResolvedValue(before);
    await expect(service.remove('a', 'admin')).resolves.toEqual({ data: { success: true } });
    expect(auth.audit).toHaveBeenCalledWith('admin', 'TESTIMONIAL_HARD_DELETED', 'Testimonial', 'a', before);
  });
});
