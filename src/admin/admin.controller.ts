import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminRole, CampaignStatus, DonationStatus, PaymentStatus } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { AdminService } from './admin.service';
import { BankAccountDto, BaselineDto, BulkDeleteDonationsDto, CampaignDto, CategoryDto, DonationConfigDto, OptionDto, PageDto, PaymentLinksDto, PaymentMethodDto, ReorderDto, SettingsDto, StatusActionDto, UpdateDto } from './admin.dto';
import { AdminAuthGuard, CsrfGuard, Roles, RolesGuard } from './admin.security';
import type { AdminRequest } from './admin.types';
import { DomainException } from '../common/domain.exception';

function normalizedQuery<T extends object>(query: T) {
  const values = query as Record<string, unknown>;
  return {
    ...query,
    page: Number(values.page ?? 1),
    limit: Number(values.limit ?? 20),
    sortOrder: values.sortOrder === 'asc' ? 'asc' as const : 'desc' as const,
  };
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
@ApiTags('admin-masters')
@Controller('admin/campaign-categories')
export class AdminCategoriesController {
  constructor(private readonly service: AdminService) {}
  @Get() list(@Query() q: PageDto) { return this.service.categories(q); }
  @Get(':id') get(@Param('id') id: string) { return this.service.category(id); }
  @Post() create(@Body() b: CategoryDto, @Req() r: AdminRequest) { return this.service.createCategory(b, r.admin!.id); }
  @Patch(':id') update(@Param('id') id: string, @Body() b: CategoryDto, @Req() r: AdminRequest) { return this.service.updateCategory(id, b, r.admin!.id); }
  @Delete(':id') remove(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.deleteCategory(id, r.admin!.id); }
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
@ApiTags('admin-masters')
@Controller('admin/payment-methods')
export class AdminPaymentMethodsController {
  constructor(private readonly service: AdminService) {}
  @Get() list(@Query() q: PageDto) { return this.service.paymentMethods(q); }
  @Get(':id') get(@Param('id') id: string) { return this.service.paymentMethod(id); }
  @Post() create(@Body() b: PaymentMethodDto, @Req() r: AdminRequest) { return this.service.createPaymentMethod(b, r.admin!.id); }
  @Patch(':id') update(@Param('id') id: string, @Body() b: PaymentMethodDto, @Req() r: AdminRequest) { return this.service.updatePaymentMethod(id, b, r.admin!.id); }
  @Post(':id/activate') activate(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.setPaymentMethodActive(id, true, r.admin!.id); }
  @Post(':id/deactivate') deactivate(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.setPaymentMethodActive(id, false, r.admin!.id); }
  @Delete(':id') remove(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.deletePaymentMethod(id, r.admin!.id); }
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
@ApiTags('admin-masters')
@Controller('admin/bank-accounts')
export class AdminBankAccountsController {
  constructor(private readonly service: AdminService) {}
  @Get() list(@Query() q: PageDto) { return this.service.bankAccounts(q); }
  @Get(':id') get(@Param('id') id: string) { return this.service.bankAccount(id); }
  @Post() create(@Body() b: BankAccountDto, @Req() r: AdminRequest) { return this.service.createBankAccount(b, r.admin!.id); }
  @Patch(':id') update(@Param('id') id: string, @Body() b: BankAccountDto, @Req() r: AdminRequest) { return this.service.updateBankAccount(id, b, r.admin!.id); }
  @Post(':id/activate') activate(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.setBankActive(id, true, r.admin!.id); }
  @Post(':id/deactivate') deactivate(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.setBankActive(id, false, r.admin!.id); }
  @Delete(':id') remove(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.deleteBank(id, r.admin!.id); }
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN)
@ApiTags('admin-settings')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: AdminService) {}
  @Get() get() { return this.service.settings(); }
  @Patch() update(@Body() b: SettingsDto, @Req() r: AdminRequest) { return this.service.updateSettings(b, r.admin!.id); }
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER)
@ApiTags('admin-campaigns')
@Controller('admin/campaigns')
export class AdminCampaignsController {
  constructor(private readonly service: AdminService) {}
  @Get() list(@Query() q: PageDto & { status?: CampaignStatus }) {
    const query = normalizedQuery(q);
    return this.service.campaigns(query, q.status);
  }
  @Get(':id') get(@Param('id') id: string) { return this.service.campaign(id); }
  @Post() create(@Body() b: CampaignDto, @Req() r: AdminRequest) { return this.service.createCampaign(b, r.admin!.id); }
  @Patch(':id') update(@Param('id') id: string, @Body() b: CampaignDto, @Req() r: AdminRequest) { return this.service.updateCampaign(id, b, r.admin!.id); }
  @Delete(':id') remove(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.deleteCampaign(id, r.admin!.id); }
  @Post(':id/publish') publish(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.lifecycle(id, CampaignStatus.PUBLISHED, r.admin!.id); }
  @Post(':id/close') close(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.lifecycle(id, CampaignStatus.CLOSED, r.admin!.id); }
  @Post(':id/archive') archive(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.lifecycle(id, CampaignStatus.ARCHIVED, r.admin!.id); }
  @Post(':id/restore-draft') restore(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.lifecycle(id, CampaignStatus.DRAFT, r.admin!.id); }
  @Put(':id/donation-config') config(@Param('id') id: string, @Body() b: DonationConfigDto, @Req() r: AdminRequest) { return this.service.putConfig(id, b, r.admin!.id); }
  @Get(':id/donation-options') options(@Param('id') id: string) { return this.service.options(id); }
  @Post(':id/donation-options') createOption(@Param('id') id: string, @Body() b: OptionDto, @Req() r: AdminRequest) { return this.service.createOption(id, b, r.admin!.id); }
  @Patch(':id/donation-options/:optionId') updateOption(@Param('id') id: string, @Param('optionId') optionId: string, @Body() b: OptionDto, @Req() r: AdminRequest) { return this.service.updateOption(id, optionId, b, r.admin!.id); }
  @Delete(':id/donation-options/:optionId') deleteOption(@Param('id') id: string, @Param('optionId') optionId: string, @Req() r: AdminRequest) { return this.service.deleteOption(id, optionId, r.admin!.id); }
  @Put(':id/payment-methods') paymentLinks(@Param('id') id: string, @Body() b: PaymentLinksDto, @Req() r: AdminRequest) { return this.service.setPaymentLinks(id, b, r.admin!.id); }
  @Get(':id/updates') updates(@Param('id') id: string) { return this.service.updates(id); }
  @Post(':id/updates') createUpdate(@Param('id') id: string, @Body() b: UpdateDto, @Req() r: AdminRequest) { return this.service.createUpdate(id, b, r.admin!.id); }
  @Patch(':id/updates/:updateId') updateUpdate(@Param('id') id: string, @Param('updateId') updateId: string, @Body() b: UpdateDto, @Req() r: AdminRequest) { return this.service.updateUpdate(id, updateId, b, r.admin!.id); }
  @Delete(':id/updates/:updateId') deleteUpdate(@Param('id') id: string, @Param('updateId') updateId: string, @Req() r: AdminRequest) { return this.service.deleteUpdate(id, updateId, r.admin!.id); }
  @Put(':id/updates/reorder') reorder(@Param('id') id: string, @Body() b: ReorderDto, @Req() r: AdminRequest) { return this.service.reorderUpdates(id, b, r.admin!.id); }
  @Get(':id/stat-baseline') baseline(@Param('id') id: string) { return this.service.baseline(id); }
  @Put(':id/stat-baseline') @Roles(AdminRole.SUPER_ADMIN)
  putBaseline(@Param('id') id: string, @Body() b: BaselineDto, @Req() r: AdminRequest) { return this.service.putBaseline(id, b, r.admin!.id); }
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.VERIFIER)
@ApiTags('admin-donations')
@Controller('admin/donations')
export class AdminDonationsController {
  constructor(private readonly service: AdminService) {}
  @Get() list(@Query() q: PageDto & Record<string, string | number | undefined>) { return this.service.donations(normalizedQuery(q)); }
  @Delete('bulk') @Roles(AdminRole.SUPER_ADMIN)
  bulkDelete(@Body() b: BulkDeleteDonationsDto, @Req() r: AdminRequest) { return this.service.deleteDonations(b.ids, r.admin!.id); }
  @Get(':id') get(@Param('id') id: string) { return this.service.donation(id); }
  @Delete(':id') @Roles(AdminRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @Req() r: AdminRequest) { return this.service.deleteDonations([id], r.admin!.id); }
  @Post(':id/manual-review') review(@Param('id') id: string, @Body() b: StatusActionDto, @Req() r: AdminRequest) { return this.service.transition(id, DonationStatus.MANUAL_REVIEW, null, b, r.admin!.id); }
  @Post(':id/verify-payment') verify(@Param('id') id: string, @Body() b: StatusActionDto, @Req() r: AdminRequest) { return this.service.transition(id, DonationStatus.PAID, PaymentStatus.VERIFIED, b, r.admin!.id); }
  @Post(':id/reject-payment') reject(@Param('id') id: string, @Body() b: StatusActionDto, @Req() r: AdminRequest) { return this.service.transition(id, DonationStatus.REJECTED, PaymentStatus.FAILED, b, r.admin!.id); }
  @Post(':id/cancel') cancel(@Param('id') id: string, @Body() b: StatusActionDto, @Req() r: AdminRequest) { return this.service.transition(id, DonationStatus.CANCELLED, PaymentStatus.CANCELLED, b, r.admin!.id); }
  @Post(':id/reopen-review') reopen(@Param('id') id: string, @Body() b: StatusActionDto, @Req() r: AdminRequest) { return this.service.transition(id, DonationStatus.MANUAL_REVIEW, null, b, r.admin!.id); }
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.VERIFIER)
@ApiTags('admin-payments')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly service: AdminService) {}
  @Get() list(@Query() q: PageDto & Record<string, string | number | undefined>) { return this.service.payments(normalizedQuery(q)); }
  @Get(':id') get(@Param('id') id: string) { return this.service.payment(id); }
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.CAMPAIGN_MANAGER, AdminRole.VERIFIER)
@ApiTags('admin-reports')
@Controller('admin')
export class AdminReportsController {
  constructor(private readonly service: AdminService) {}
  @Get('dashboard/summary') dashboard() { return this.service.dashboard(); }
  @Get('reports/campaigns') campaigns() { return this.service.campaignReport(); }
  @Get('reports/donations') @Roles(AdminRole.SUPER_ADMIN, AdminRole.VERIFIER)
  donations(@Query() q: PageDto & Record<string, string | number | undefined>) { return this.service.donations(normalizedQuery(q)); }
  @Get('reports/attribution') attribution() { return this.service.attributionReport(); }
  @Get('reports/payment-methods') methods() { return this.service.paymentMethodReport(); }
  @Get('reports/:kind/export')
  async export(@Param('kind') kind: 'donations' | 'campaigns' | 'attribution', @Query('format') format: 'csv' | 'xlsx' = 'csv', @Query() q: PageDto & Record<string, string | number | undefined>, @Req() request: AdminRequest, @Res() res: Response) {
    if (kind === 'donations' && request.admin?.role === AdminRole.CAMPAIGN_MANAGER) {
      throw new DomainException('FORBIDDEN', 'Laporan detail donor hanya untuk verifier.', HttpStatus.FORBIDDEN);
    }
    let rows: Record<string, unknown>[];
    if (kind === 'campaigns') rows = (await this.service.campaignReport()).data;
    else if (kind === 'attribution') rows = (await this.service.attributionReport()).data;
    else rows = await this.service.donationExport(normalizedQuery(q));
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Laporan');
      const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      sheet.columns = headers.map((header) => ({ header, key: header, width: 24 }));
      rows.forEach((row) => sheet.addRow(row));
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${kind}.xlsx"`);
      return res.send(Buffer.from(buffer));
    }
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((header) => escape(typeof row[header] === 'object' ? JSON.stringify(row[header]) : row[header])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${kind}.csv"`);
    return res.send(`\uFEFF${csv}`);
  }
}

@UseGuards(AdminAuthGuard, RolesGuard, CsrfGuard)
@Roles(AdminRole.SUPER_ADMIN)
@ApiTags('admin-audit')
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly service: AdminService) {}
  @Get() list(@Query() q: PageDto & Record<string, string | number | undefined>) { return this.service.auditLogs(normalizedQuery(q)); }
  @Get(':id') get(@Param('id') id: string) { return this.service.auditLog(id); }
}
