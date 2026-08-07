import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const urlOrPath = /^(?:https?:\/\/|\/)/;

export class SaveTestimonialDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @Transform(({ value }) => typeof value === 'string' && value.trim() ? value.trim() : undefined)
  @IsOptional() @IsString() @MaxLength(100)
  role?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(220)
  quote!: string;

  @Transform(({ value }) => typeof value === 'string' && value.trim() ? value.trim() : undefined)
  @IsOptional() @IsString() @Matches(urlOrPath) @MaxLength(2048)
  photoUrl?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsDateString()
  expectedUpdatedAt?: string;
}

export class ReorderTestimonialsDto {
  @IsArray() @IsString({ each: true })
  ids!: string[];
}
