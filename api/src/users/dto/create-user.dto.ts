import { IsString, IsEmail, MinLength, MaxLength, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

const ROLES = ['ADMIN', 'MANAGER', 'OFFICER', 'VIEWER'] as const;

export class CreateUserDto {
  @IsString({ message: 'Emri i përdoruesit duhet të jetë tekst' })
  @MinLength(3, { message: 'Emri i përdoruesit duhet të ketë të paktën 3 karaktere' })
  @MaxLength(50, { message: 'Emri i përdoruesit nuk mund të kalojë 50 karaktere' })
  @Matches(/^[a-z0-9._-]+$/, { message: 'Emri i përdoruesit mund të përmbajë vetëm shkronja të vogla, numra, pika, viza dhe nënviza' })
  username: string;

  @IsString({ message: 'Fjalëkalimi duhet të jetë tekst' })
  @MinLength(8, { message: 'Fjalëkalimi duhet të ketë të paktën 8 karaktere' })
  @MaxLength(100, { message: 'Fjalëkalimi nuk mund të kalojë 100 karaktere' })
  password: string;

  @IsString({ message: 'Emri i plotë duhet të jetë tekst' })
  @MinLength(2, { message: 'Emri i plotë duhet të ketë të paktën 2 karaktere' })
  @MaxLength(100, { message: 'Emri i plotë nuk mund të kalojë 100 karaktere' })
  fullName: string;

  @IsEmail({}, { message: 'Vendosni një adresë emaili të vlefshme' })
  @MaxLength(150, { message: 'Emaili nuk mund të kalojë 150 karaktere' })
  email: string;

  @IsIn(ROLES, { message: 'Roli i zgjedhur nuk është i vlefshëm' })
  role: string;

  @IsOptional()
  @IsUUID('4', { message: 'Zyra e zgjedhur nuk është e vlefshme' })
  officeId?: string;
}
