import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { verify } from 'jsonwebtoken';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminRequest } from './admin.types';

export const ADMIN_ROLES = 'admin_roles';
export const Roles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES, roles);
export const CsrfExempt = () => SetMetadata('csrf_exempt', true);

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = request.cookies?.admin_access as string | undefined;
    if (!token) {
      throw new DomainException(
        'UNAUTHENTICATED',
        'Sesi admin diperlukan.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    try {
      const payload = verify(
        token,
        process.env.ADMIN_JWT_SECRET ?? 'local-admin-secret-change-me',
      ) as { sub: string; type: string };
      if (payload.type !== 'access') throw new Error('invalid token type');
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
      });
      if (!admin?.isActive) throw new Error('inactive');
      request.admin = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      };
      return true;
    } catch {
      throw new DomainException(
        'UNAUTHENTICATED',
        'Sesi admin tidak valid atau kedaluwarsa.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (!request.admin || !required.includes(request.admin.role)) {
      throw new DomainException(
        'FORBIDDEN',
        'Anda tidak memiliki izin untuk tindakan ini.',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (this.reflector.getAllAndOverride('csrf_exempt', [
      context.getHandler(),
      context.getClass(),
    ])) return true;
    const cookie = request.cookies?.admin_csrf as string | undefined;
    const header = request.get('x-csrf-token');
    if (!cookie || !header || cookie !== header) {
      throw new DomainException(
        'CSRF_INVALID',
        'CSRF token tidak valid.',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
