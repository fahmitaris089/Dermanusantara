import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ContributionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class DonorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  whatsapp!: string;

  @IsBoolean()
  isAnonymous = false;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class AttributionDto {
  @IsOptional() @IsString() @MaxLength(100) utmSource?: string;
  @IsOptional() @IsString() @MaxLength(100) utmMedium?: string;
  @IsOptional() @IsString() @MaxLength(150) utmCampaign?: string;
  @IsOptional() @IsString() @MaxLength(150) utmContent?: string;
  @IsOptional() @IsString() @MaxLength(150) utmTerm?: string;
}

export class CreateDonationDto {
  @IsString()
  @IsNotEmpty()
  campaignId!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ContributionDto)
  contribution!: ContributionDto;

  @IsObject()
  @ValidateNested()
  @Type(() => DonorDto)
  donor!: DonorDto;

  @IsString()
  @IsNotEmpty()
  paymentMethodCode!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AttributionDto)
  attribution?: AttributionDto;
}
