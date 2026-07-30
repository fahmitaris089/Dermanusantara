import { AdminRole, ContributionInputType, PaymentMethodType, TargetMetric } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(10) newPassword!: string;
}
export class CreateAdminDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEnum(AdminRole) role!: AdminRole;
  @IsString() @MinLength(10) password!: string;
}
export class UpdateAdminDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsEnum(AdminRole) role?: AdminRole;
}
export class ResetPasswordDto {
  @IsString() @MinLength(10) password!: string;
}
export class PageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsEnum(['asc', 'desc'] as const) sortOrder: 'asc' | 'desc' = 'desc';
}
export class CategoryDto {
  @IsString() @MinLength(2) @MaxLength(40) code!: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
}
export class PaymentMethodDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsEnum(PaymentMethodType) type!: PaymentMethodType;
  @IsOptional() @IsInt() @Min(1) minimumAmount?: number;
  @IsOptional() @IsInt() @Min(1) maximumAmount?: number;
  @IsBoolean() uniqueCodeEnabled!: boolean;
  @IsInt() @Min(1) expiryMinutes!: number;
}
export class BankAccountDto {
  @IsString() bankName!: string;
  @IsString() accountNumber!: string;
  @IsString() accountHolderName!: string;
  @IsArray() @IsString({ each: true }) instructions!: string[];
}
export class CampaignDto {
  @IsString() categoryId!: string;
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsString() shortDescription!: string;
  @IsString() description!: string;
  @IsString() coverImageUrl!: string;
  @IsOptional() @IsString() coverImageAlt?: string;
  @IsOptional() @IsString() location?: string;
  @IsArray() @IsString({ each: true }) story!: string[];
  @IsArray() @IsString({ each: true }) highlights!: string[];
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() acceptingDonations?: boolean;
  @IsOptional() @IsEnum(TargetMetric) targetMetric?: TargetMetric;
  @IsOptional() @IsInt() @Min(1) targetAmount?: number;
  @IsOptional() @IsInt() @Min(1) targetQuantity?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsString() expectedUpdatedAt?: string;
}
export class DonationConfigDto {
  @IsEnum(ContributionInputType) inputType!: ContributionInputType;
  @IsOptional() @IsString() currency = 'IDR';
  @IsOptional() @IsInt() @Min(1) minimumAmount?: number;
  @IsOptional() @IsInt() @Min(1) maximumAmount?: number;
  @IsOptional() @IsBoolean() allowCustomAmount?: boolean;
  @IsOptional() @IsString() unitName?: string;
  @IsOptional() @IsString() unitLabel?: string;
  @IsOptional() @IsInt() @Min(1) unitPrice?: number;
  @IsOptional() @IsInt() @Min(1) minimumQuantity?: number;
  @IsOptional() @IsInt() @Min(1) maximumQuantity?: number;
  @IsOptional() @IsInt() @Min(1) quantityStep?: number;
}
export class OptionDto {
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class PaymentLinksDto {
  @IsArray() @IsString({ each: true }) paymentMethodIds!: string[];
}
export class UpdateDto {
  @IsString() publishedAt!: string;
  @IsString() title!: string;
  @IsString() excerpt!: string;
  @IsArray() @IsString({ each: true }) content!: string[];
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class ReorderDto {
  @IsArray() @IsString({ each: true }) ids!: string[];
}
export class BaselineDto {
  @IsInt() @Min(0) collectedAmount!: number;
  @IsInt() @Min(0) collectedQuantity!: number;
  @IsInt() @Min(0) paidDonationCount!: number;
  @IsString() @MinLength(3) reason!: string;
}
export class StatusActionDto {
  @IsString() @MinLength(3) note!: string;
  @IsOptional() @IsString() bankReference?: string;
}
export class SettingsDto {
  @IsObject() values!: Record<string, unknown>;
}
