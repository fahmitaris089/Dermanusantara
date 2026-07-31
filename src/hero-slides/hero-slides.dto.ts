import { IsArray, IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const urlOrPath = /^(?:https?:\/\/|\/)/;

export class SaveHeroSlideDto {
  @IsString() @IsNotEmpty() @Matches(urlOrPath) @MaxLength(2048)
  desktopImageUrl!: string;

  @IsString() @IsNotEmpty() @MaxLength(240)
  desktopImageAlt!: string;

  @Transform(({ value }) => value === '' ? undefined : value) @IsOptional() @IsString() @Matches(urlOrPath) @MaxLength(2048)
  mobileImageUrl?: string;

  @IsOptional() @IsString() @MaxLength(240)
  mobileImageAlt?: string;

  @Transform(({ value }) => value === '' ? undefined : value) @IsOptional() @IsString() @Matches(urlOrPath) @MaxLength(2048)
  linkUrl?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsDateString()
  expectedUpdatedAt?: string;
}

export class ReorderHeroSlidesDto {
  @IsArray() @IsString({ each: true })
  ids!: string[];
}
