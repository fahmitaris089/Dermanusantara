import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AdminRole, Prisma } from '@prisma/client';
import { hash, verify as verifyPassword } from 'argon2';
import { sign, verify } from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminPrincipal, AdminRequest } from './admin.types';
import { ChangePasswordDto, CreateAdminDto, LoginDto, PageDto, ResetPasswordDto, UpdateAdminDto } from './admin.dto';

const permissions: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ['*'],
  CAMPAIGN_MANAGER: ['campaigns:write', 'masters:write', 'media:write', 'reports:read'],
  VERIFIER: ['donations:read', 'payments:verify', 'reports:read'],
};

@Injectable()
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService) {}

  private secret() {
    return process.env.ADMIN_JWT_SECRET || 'local-admin-secret-change-me';
  }
  private digest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private profile(user: AdminPrincipal) {
    return { ...user, permissions: permissions[user.role] };
  }
  private cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge,
    };
  }
  private setCookies(response: Response, access: string, refresh: string, csrf: string) {
    response.cookie('admin_access', access, this.cookieOptions(15 * 60_000));
    response.cookie('admin_refresh', refresh, this.cookieOptions(7 * 86_400_000));
    response.cookie('admin_csrf', csrf, {
      ...this.cookieOptions(7 * 86_400_000),
      httpOnly: false,
    });
  }
  private clearCookies(response: Response) {
    for (const name of ['admin_access', 'admin_refresh', 'admin_csrf']) {
      response.clearCookie(name, { path: '/' });
    }
  }
  private async issue(user: AdminPrincipal, request: Request, response: Response, family: string = randomUUID()) {
    const sessionId = randomUUID();
    const refresh = sign(
      { sub: user.id, sid: sessionId, family, type: 'refresh' },
      this.secret(),
      { expiresIn: '7d' },
    );
    const access = sign({ sub: user.id, type: 'access' }, this.secret(), {
      expiresIn: '15m',
    });
    await this.prisma.adminSession.create({
      data: {
        id: sessionId,
        adminUserId: user.id,
        tokenHash: this.digest(refresh),
        tokenFamily: family,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        ipAddress: request.ip,
        userAgent: request.get('user-agent')?.slice(0, 1000),
      },
    });
    this.setCookies(response, access, refresh, randomBytes(24).toString('hex'));
  }

  async login(input: LoginDto, request: Request, response: Response) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });
    if (!user?.isActive || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new DomainException('INVALID_CREDENTIALS', 'Email atau password salah.', HttpStatus.UNAUTHORIZED);
    }
    const principal = { id: user.id, email: user.email, name: user.name, role: user.role };
    await this.issue(principal, request, response);
    await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { data: this.profile(principal) };
  }

  async refresh(request: Request, response: Response) {
    const token = request.cookies?.admin_refresh as string | undefined;
    if (!token) throw new DomainException('UNAUTHENTICATED', 'Refresh token tidak tersedia.', HttpStatus.UNAUTHORIZED);
    try {
      const payload = verify(token, this.secret()) as { sub: string; sid: string; family: string; type: string };
      if (payload.type !== 'refresh') throw new Error();
      const session = await this.prisma.adminSession.findUnique({ where: { id: payload.sid }, include: { adminUser: true } });
      if (!session || session.revokedAt || session.expiresAt <= new Date() || session.tokenHash !== this.digest(token) || !session.adminUser.isActive) {
        if (session) await this.prisma.adminSession.updateMany({ where: { tokenFamily: session.tokenFamily }, data: { revokedAt: new Date() } });
        throw new Error();
      }
      await this.prisma.adminSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      const user = session.adminUser;
      const principal = { id: user.id, email: user.email, name: user.name, role: user.role };
      await this.issue(principal, request, response, session.tokenFamily);
      return { data: this.profile(principal) };
    } catch {
      this.clearCookies(response);
      throw new DomainException('UNAUTHENTICATED', 'Refresh token tidak valid.', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(request: AdminRequest, response: Response) {
    const token = request.cookies?.admin_refresh as string | undefined;
    if (token) await this.prisma.adminSession.updateMany({ where: { tokenHash: this.digest(token) }, data: { revokedAt: new Date() } });
    this.clearCookies(response);
    return { data: { success: true } };
  }
  async logoutAll(adminId: string, response: Response) {
    await this.prisma.adminSession.updateMany({ where: { adminUserId: adminId, revokedAt: null }, data: { revokedAt: new Date() } });
    this.clearCookies(response);
    return { data: { success: true } };
  }
  me(admin: AdminPrincipal) {
    return { data: this.profile(admin) };
  }
  async changePassword(adminId: string, input: ChangePasswordDto, response: Response) {
    const user = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new DomainException('INVALID_CREDENTIALS', 'Password lama salah.', HttpStatus.BAD_REQUEST);
    }
    await this.prisma.$transaction([
      this.prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash: await hash(input.newPassword) } }),
      this.prisma.adminSession.updateMany({ where: { adminUserId: adminId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    this.clearCookies(response);
    return { data: { success: true } };
  }

  async users(query: PageDto) {
    const where: Prisma.AdminUserWhereInput = query.search
      ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }] }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminUser.findMany({ where, select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.adminUser.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
  async user(id: string) {
    const data = await this.prisma.adminUser.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true } });
    if (!data) throw new DomainException('NOT_FOUND', 'Admin tidak ditemukan.', HttpStatus.NOT_FOUND);
    return { data };
  }
  async createUser(input: CreateAdminDto, actorId: string) {
    const data = await this.prisma.adminUser.create({ data: { email: input.email.toLowerCase(), name: input.name, role: input.role, passwordHash: await hash(input.password) } });
    await this.audit(actorId, 'ADMIN_USER_CREATED', 'AdminUser', data.id, null, { email: data.email, name: data.name, role: data.role });
    return this.user(data.id);
  }
  async updateUser(id: string, input: UpdateAdminDto, actorId: string) {
    const before = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!before) throw new DomainException('NOT_FOUND', 'Admin tidak ditemukan.', HttpStatus.NOT_FOUND);
    const data = await this.prisma.adminUser.update({ where: { id }, data: { ...input, email: input.email?.toLowerCase() } });
    await this.audit(actorId, 'ADMIN_USER_UPDATED', 'AdminUser', id, { email: before.email, name: before.name, role: before.role }, { email: data.email, name: data.name, role: data.role });
    return this.user(id);
  }
  async setActive(id: string, active: boolean, actorId: string) {
    if (!active && id === actorId) throw new DomainException('FORBIDDEN', 'Tidak dapat menonaktifkan akun sendiri.', HttpStatus.CONFLICT);
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user) throw new DomainException('NOT_FOUND', 'Admin tidak ditemukan.', HttpStatus.NOT_FOUND);
    if (!active && user.role === AdminRole.SUPER_ADMIN && await this.prisma.adminUser.count({ where: { role: AdminRole.SUPER_ADMIN, isActive: true } }) <= 1) {
      throw new DomainException('LAST_SUPER_ADMIN', 'SUPER_ADMIN aktif terakhir tidak dapat dinonaktifkan.', HttpStatus.CONFLICT);
    }
    await this.prisma.$transaction([
      this.prisma.adminUser.update({ where: { id }, data: { isActive: active } }),
      ...(active ? [] : [this.prisma.adminSession.updateMany({ where: { adminUserId: id, revokedAt: null }, data: { revokedAt: new Date() } })]),
    ]);
    await this.audit(actorId, active ? 'ADMIN_USER_ACTIVATED' : 'ADMIN_USER_DEACTIVATED', 'AdminUser', id);
    return this.user(id);
  }
  async resetPassword(id: string, input: ResetPasswordDto, actorId: string) {
    await this.prisma.$transaction([
      this.prisma.adminUser.update({ where: { id }, data: { passwordHash: await hash(input.password) } }),
      this.prisma.adminSession.updateMany({ where: { adminUserId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit(actorId, 'ADMIN_PASSWORD_RESET', 'AdminUser', id);
    return { data: { success: true } };
  }
  async sessions(id: string) {
    return { data: await this.prisma.adminSession.findMany({ where: { adminUserId: id }, select: { id: true, expiresAt: true, revokedAt: true, ipAddress: true, userAgent: true, createdAt: true }, orderBy: { createdAt: 'desc' } }) };
  }
  async revokeSessions(id: string, actorId: string) {
    const result = await this.prisma.adminSession.updateMany({ where: { adminUserId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit(actorId, 'ADMIN_SESSIONS_REVOKED', 'AdminUser', id);
    return { data: { revoked: result.count } };
  }
  async audit(actorId: string, action: string, entityType: string, entityId?: string, beforeData?: object | null, afterData?: object | null, reason?: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entityType, entityId, beforeData: beforeData as Prisma.InputJsonValue | undefined, afterData: afterData as Prisma.InputJsonValue | undefined, reason } });
  }
}
