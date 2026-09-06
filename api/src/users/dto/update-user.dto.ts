import { IsString, IsEmail, MinLength, MaxLength, IsIn, IsOptional, IsUUID, IsBoolean } from 'class-validator';

const ROLES = ['ADMIN', 'MANAGER', 'OFFICER', 'VIEWER'] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: string;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;
}
