import { ArticleStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class ArticleBlockDto {
  @IsEnum(['paragraph', 'heading', 'quote', 'image'])
  type!: 'paragraph' | 'heading' | 'quote' | 'image';
  @IsOptional() @IsString() @MaxLength(5000) text?: string;
  @IsOptional() @IsInt() @Min(2) @Max(3) level?: number;
  @IsOptional() @IsString() @MaxLength(160) attribution?: string;
  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(2048) url?: string;
  @IsOptional() @IsString() @MaxLength(240) alt?: string;
  @IsOptional() @IsString() @MaxLength(300) caption?: string;
}

export class SaveArticleDto {
  @IsString() @IsNotEmpty() categoryId!: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(180) slug!: string;
  @IsString() @IsNotEmpty() @MaxLength(180) title!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) excerpt!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) authorName!: string;
  @IsInt() @Min(1) @Max(120) readTimeMinutes!: number;
  @IsUrl({ require_tld: false }) @MaxLength(2048) coverImageUrl!: string;
  @IsString() @IsNotEmpty() @MaxLength(240) coverImageAlt!: string;
  @IsOptional() @IsString() @MaxLength(300) coverImageCaption?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ArticleBlockDto) content!: ArticleBlockDto[];
  @IsOptional() @IsInt() @Min(0) disbursedAmount?: number;
  @IsOptional() @IsInt() @Min(0) beneficiaryCount?: number;
  @IsOptional() @IsString() @MaxLength(50) beneficiaryUnit?: string;
  @IsOptional() @IsString() @MaxLength(180) ctaTitle?: string;
  @IsOptional() @IsString() @MaxLength(500) ctaDescription?: string;
  @IsOptional() @IsInt() @Min(0) ctaStartingAmount?: number;
  @IsOptional() @IsString() @MaxLength(100) ctaVerificationTime?: string;
  @IsOptional() @IsString() @MaxLength(80) ctaButtonLabel?: string;
  @IsOptional() @IsString() @Matches(/^(?:https?:\/\/|\/)/, { message: 'ctaUrl harus berupa URL http(s) atau path internal yang diawali /.' }) @MaxLength(2048) ctaUrl?: string;
  @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(160) seoDescription?: string;
  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(2048) ogImageUrl?: string;
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
}

export class ArticleListDto {
  @IsOptional() @Transform(({ value }) => Number(value ?? 1)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value ?? 10)) @IsInt() @Min(1) @Max(100) limit = 10;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ArticleStatus) status?: ArticleStatus;
}

export class PublishArticleDto {
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsDateString() expectedUpdatedAt!: string;
}

export class ConcurrencyDto {
  @IsDateString() expectedUpdatedAt!: string;
}

export class SaveArticleCategoryDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(80) code!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
