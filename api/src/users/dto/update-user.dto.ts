import { IsString, IsEmail, MinLength, MaxLength, IsIn, IsOptional, IsBoolean } from 'class-validator';

const ROLES = ['ADMIN', 'MANAGER', 'OFFICER', 'VIEWER'] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Emri i plotë duhet të jetë tekst' })
  @MinLength(2, { message: 'Emri i plotë duhet të ketë të paktën 2 karaktere' })
  @MaxLength(100, { message: 'Emri i plotë nuk mund të kalojë 100 karaktere' })
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Vendosni një adresë emaili të vlefshme' })
  @MaxLength(150, { message: 'Emaili nuk mund të kalojë 150 karaktere' })
  email?: string;

  @IsOptional()
  @IsIn(ROLES, { message: 'Roli i zgjedhur nuk është i vlefshëm' })
  role?: string;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsBoolean({ message: 'Statusi duhet të jetë i vlefshëm' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'Fjalëkalimi duhet të jetë tekst' })
  @MinLength(8, { message: 'Fjalëkalimi duhet të ketë të paktën 8 karaktere' })
  @MaxLength(100, { message: 'Fjalëkalimi nuk mund të kalojë 100 karaktere' })
  password?: string;
}
