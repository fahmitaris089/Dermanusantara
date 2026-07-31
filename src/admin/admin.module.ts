import { Module } from '@nestjs/common';
import {
  AdminAuditController,
  AdminBankAccountsController,
  AdminCampaignsController,
  AdminCategoriesController,
  AdminDonationsController,
  AdminPaymentMethodsController,
  AdminPaymentsController,
  AdminReportsController,
  AdminSettingsController,
} from './admin.controller';
import { AdminAuthController, AdminUsersController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminMediaController } from './admin-media.controller';
import { AdminAuthGuard, CsrfGuard, RolesGuard } from './admin.security';
import { AdminService } from './admin.service';

@Module({
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminCategoriesController,
    AdminPaymentMethodsController,
    AdminBankAccountsController,
    AdminSettingsController,
    AdminCampaignsController,
    AdminDonationsController,
    AdminPaymentsController,
    AdminReportsController,
    AdminAuditController,
    AdminMediaController,
  ],
  providers: [AdminAuthService, AdminService, AdminAuthGuard, RolesGuard, CsrfGuard],
  exports: [AdminAuthService],
})
export class AdminModule {}
