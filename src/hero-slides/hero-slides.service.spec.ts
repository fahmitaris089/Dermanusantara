import { HttpStatus } from '@nestjs/common';
import { HeroSlidesService } from './hero-slides.service';

describe('HeroSlidesService', () => {
  const prisma = {
    heroSlide: {
      findMany: jest.fn(), findUnique: jest.fn(), aggregate: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const auth = { audit: jest.fn() };
  const service = new HeroSlidesService(prisma as never, auth as never);

  beforeEach(() => jest.clearAllMocks());

  it('public hanya meminta slider aktif sesuai urutan', async () => {
    prisma.heroSlide.findMany.mockResolvedValue([{ id: 'a', isActive: true, sortOrder: 0 }]);
    await expect(service.publicList()).resolves.toEqual({ data: [{ id: 'a', isActive: true, sortOrder: 0 }] });
    expect(prisma.heroSlide.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  });

  it('menolak update dari data yang sudah kedaluwarsa', async () => {
    prisma.heroSlide.findUnique.mockResolvedValue({ id: 'a', updatedAt: new Date('2026-07-31T10:00:00Z') });
    await expect(service.update('a', { desktopImageUrl: '/a.webp', desktopImageAlt: 'A', expectedUpdatedAt: '2026-07-31T09:00:00Z' }, 'admin')).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    expect(prisma.heroSlide.update).not.toHaveBeenCalled();
  });

  it('reorder wajib memuat seluruh id tepat satu kali', async () => {
    prisma.heroSlide.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(service.reorder({ ids: ['a', 'a'] }, 'admin')).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('menghapus slider permanen dan mencatat audit', async () => {
    const before = { id: 'a', updatedAt: new Date() };
    prisma.heroSlide.findUnique.mockResolvedValue(before);
    prisma.heroSlide.delete.mockResolvedValue(before);
    await expect(service.remove('a', 'admin')).resolves.toEqual({ data: { success: true } });
    expect(auth.audit).toHaveBeenCalledWith('admin', 'HERO_SLIDE_HARD_DELETED', 'HeroSlide', 'a', before);
  });
});
