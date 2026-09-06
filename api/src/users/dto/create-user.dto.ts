import { IsString, IsEmail, MinLength, MaxLength, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

const ROLES = ['ADMIN', 'MANAGER', 'OFFICER', 'VIEWER'] as const;

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9._-]+$/, { message: 'Username may only contain lowercase letters, digits, dots, hyphens and underscores' })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsIn(ROLES)
  role: string;

  @IsOptional()
  @IsUUID()
  officeId?: string;
}
