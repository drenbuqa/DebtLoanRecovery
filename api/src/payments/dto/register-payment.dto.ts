import { IsString, IsNumber, IsPositive, IsDateString, IsOptional, IsIn, IsUUID, MaxLength } from 'class-validator';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHECK', 'CARD', 'OTHER'] as const;

export class RegisterPaymentDto {
  @IsUUID('4', { message: 'Dosja e zgjedhur nuk është e vlefshme' })
  caseId: string;

  @IsNumber({}, { message: 'Shuma duhet të jetë një numër' })
  @IsPositive({ message: 'Shuma duhet të jetë më e madhe se zero' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'Monedha duhet të jetë tekst' })
  @MaxLength(3, { message: 'Monedha nuk mund të kalojë 3 karaktere' })
  currency?: string;

  @IsDateString({}, { message: 'Data e pagesës nuk është e vlefshme' })
  paymentDate: string;

  @IsIn(PAYMENT_METHODS, { message: 'Metoda e pagesës nuk është e vlefshme' })
  paymentMethod: string;

  @IsOptional()
  @IsString({ message: 'Shënimet duhet të jenë tekst' })
  @MaxLength(500, { message: 'Shënimet nuk mund të kalojnë 500 karaktere' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'Referenca duhet të jetë tekst' })
  @MaxLength(100, { message: 'Referenca nuk mund të kalojë 100 karaktere' })
  externalReference?: string;
}
