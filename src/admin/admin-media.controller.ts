import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import { Controller, Delete, Get, HttpStatus, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuthService } from './admin-auth.service';
import { PageDto } from './admin.dto';
import { AdminAuthGuard, CsrfGuard, Roles, RolesGuard } from './admin.security';
import type { AdminRequest } from './admin.types';

const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
mkdirSync(uploadDir, { recursive: true });

function validSignature(file: Express.Multer.File) {
  const bytes = readFileSync(file.path).subarray(0, 12);
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return png || jpeg || webp;
}

@ApiTags('admin-media')
@Controller('admin/media')
@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
export class AdminMediaController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AdminAuthService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (_request, file, callback) => callback(null, `${randomBytes(18).toString('hex')}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
  }))
  async upload(@UploadedFile() file: Express.Multer.File | undefined, @Req() request: AdminRequest) {
    if (!file) throw new DomainException('VALIDATION_ERROR', 'File JPEG, PNG, atau WebP wajib diunggah.', HttpStatus.BAD_REQUEST);
    if (!validSignature(file)) {
      unlinkSync(file.path);
      throw new DomainException('VALIDATION_ERROR', 'Signature file gambar tidak valid.', HttpStatus.BAD_REQUEST);
    }
    const base = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const data = await this.prisma.mediaAsset.create({ data: { storedName: file.filename, originalName: file.originalname, url: `${base}/uploads/${file.filename}`, mimeType: file.mimetype, size: file.size, uploaderId: request.admin!.id } });
    await this.auth.audit(request.admin!.id, 'MEDIA_UPLOADED', 'MediaAsset', data.id, null, { url: data.url, mimeType: data.mimeType, size: data.size });
    return { data };
  }
  @Get()
  async list(@Query() query: PageDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.mediaAsset.findMany({ skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.mediaAsset.count(),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!data) throw new DomainException('NOT_FOUND', 'Media tidak ditemukan.', HttpStatus.NOT_FOUND);
    return { data };
  }
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AdminRequest) {
    const media = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!media) throw new DomainException('NOT_FOUND', 'Media tidak ditemukan.', HttpStatus.NOT_FOUND);
    if (await this.prisma.campaign.count({ where: { coverImageUrl: media.url } })) throw new DomainException('RESOURCE_IN_USE', 'Media sedang digunakan campaign.', HttpStatus.CONFLICT);
    if (await this.prisma.article.count({ where: { OR: [{ coverImageUrl: media.url }, { ogImageUrl: media.url }] } })) throw new DomainException('RESOURCE_IN_USE', 'Media sedang digunakan sebagai cover atau OG image artikel.', HttpStatus.CONFLICT);
    if (await this.prisma.heroSlide.count({ where: { OR: [{ desktopImageUrl: media.url }, { mobileImageUrl: media.url }] } })) throw new DomainException('RESOURCE_IN_USE', 'Media sedang digunakan hero slider.', HttpStatus.CONFLICT);
    if (await this.prisma.testimonial.count({ where: { photoUrl: media.url } })) throw new DomainException('RESOURCE_IN_USE', 'Media sedang digunakan testimoni.', HttpStatus.CONFLICT);
    const articleContents = await this.prisma.article.findMany({ select: { content: true } });
    if (articleContents.some(({ content }) => Array.isArray(content) && content.some((block) => typeof block === 'object' && block !== null && !Array.isArray(block) && (block as { url?: string }).url === media.url))) {
      throw new DomainException('RESOURCE_IN_USE', 'Media sedang digunakan di dalam konten artikel.', HttpStatus.CONFLICT);
    }
    await this.prisma.mediaAsset.delete({ where: { id } });
    try {
      unlinkSync(join(uploadDir, media.storedName));
    } catch {
      // The database record remains the source of truth if the file is already absent.
    }
    await this.auth.audit(request.admin!.id, 'MEDIA_DELETED', 'MediaAsset', id);
    return { data: { success: true } };
  }
}
