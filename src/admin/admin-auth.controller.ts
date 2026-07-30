import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { ChangePasswordDto, CreateAdminDto, LoginDto, PageDto, ResetPasswordDto, UpdateAdminDto } from './admin.dto';
import { AdminAuthGuard, CsrfExempt, CsrfGuard, Roles, RolesGuard } from './admin.security';
import type { AdminRequest } from './admin.types';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}
  @Post('login') @CsrfExempt() @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() body: LoginDto, @Req() req: AdminRequest, @Res({ passthrough: true }) res: Response) { return this.auth.login(body, req, res); }
  @Post('refresh') @CsrfExempt()
  refresh(@Req() req: AdminRequest, @Res({ passthrough: true }) res: Response) { return this.auth.refresh(req, res); }
  @Post('logout') @UseGuards(AdminAuthGuard, CsrfGuard)
  logout(@Req() req: AdminRequest, @Res({ passthrough: true }) res: Response) { return this.auth.logout(req, res); }
  @Post('logout-all') @UseGuards(AdminAuthGuard, CsrfGuard)
  logoutAll(@Req() req: AdminRequest, @Res({ passthrough: true }) res: Response) { return this.auth.logoutAll(req.admin!.id, res); }
  @Get('me') @UseGuards(AdminAuthGuard)
  me(@Req() req: AdminRequest) { return this.auth.me(req.admin!); }
  @Patch('change-password') @UseGuards(AdminAuthGuard, CsrfGuard)
  change(@Body() body: ChangePasswordDto, @Req() req: AdminRequest, @Res({ passthrough: true }) res: Response) { return this.auth.changePassword(req.admin!.id, body, res); }
}

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN)
export class AdminUsersController {
  constructor(private readonly auth: AdminAuthService) {}
  @Get() list(@Query() query: PageDto) { return this.auth.users(query); }
  @Get(':id') get(@Param('id') id: string) { return this.auth.user(id); }
  @Post() create(@Body() body: CreateAdminDto, @Req() req: AdminRequest) { return this.auth.createUser(body, req.admin!.id); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: UpdateAdminDto, @Req() req: AdminRequest) { return this.auth.updateUser(id, body, req.admin!.id); }
  @Post(':id/activate') activate(@Param('id') id: string, @Req() req: AdminRequest) { return this.auth.setActive(id, true, req.admin!.id); }
  @Post(':id/deactivate') deactivate(@Param('id') id: string, @Req() req: AdminRequest) { return this.auth.setActive(id, false, req.admin!.id); }
  @Post(':id/reset-password') reset(@Param('id') id: string, @Body() body: ResetPasswordDto, @Req() req: AdminRequest) { return this.auth.resetPassword(id, body, req.admin!.id); }
  @Get(':id/sessions') sessions(@Param('id') id: string) { return this.auth.sessions(id); }
  @Post(':id/revoke-sessions') revoke(@Param('id') id: string, @Req() req: AdminRequest) { return this.auth.revokeSessions(id, req.admin!.id); }
}
