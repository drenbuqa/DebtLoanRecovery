import { IsString, MinLength, MaxLength, IsIn, IsOptional, Matches } from 'class-validator';

const ROLES = ['ADMIN', 'MANAGER', 'OFFICER', 'VIEWER'] as const;

export class CreateUserDto {
  @IsString({ message: 'Emri i përdoruesit duhet të jetë tekst' })
  @MinLength(3, { message: 'Emri i përdoruesit duhet të ketë të paktën 3 karaktere' })
  @MaxLength(50, { message: 'Emri i përdoruesit nuk mund të kalojë 50 karaktere' })
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'Emri i përdoruesit mund të përmbajë vetëm shkronja, numra, pika, viza dhe nënviza' })
  username: string;

  @IsString({ message: 'Fjalëkalimi duhet të jetë tekst' })
  @MinLength(8, { message: 'Fjalëkalimi duhet të ketë të paktën 8 karaktere' })
  @MaxLength(100, { message: 'Fjalëkalimi nuk mund të kalojë 100 karaktere' })
  password: string;

  @IsString({ message: 'Emri i plotë duhet të jetë tekst' })
  @MinLength(2, { message: 'Emri i plotë duhet të ketë të paktën 2 karaktere' })
  @MaxLength(100, { message: 'Emri i plotë nuk mund të kalojë 100 karaktere' })
  fullName: string;

  @IsIn(ROLES, { message: 'Roli i zgjedhur nuk është i vlefshëm' })
  role: string;

  @IsOptional()
  @IsString()
  officeId?: string;
}
