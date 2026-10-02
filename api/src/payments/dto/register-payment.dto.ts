import { IsString, IsNumber, IsPositive, IsDateString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class RegisterPaymentDto {
  @IsString() @IsNotEmpty({ message: 'Ju lutem zgjidhni një klient' })
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

  @IsOptional()
  @IsString({ message: 'Shënimet duhet të jenë tekst' })
  @MaxLength(500, { message: 'Shënimet nuk mund të kalojnë 500 karaktere' })
  notes?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data e pagesës tjetër nuk është e vlefshme' })
  nextPaymentDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Shuma e pagesës tjetër duhet të jetë numër' })
  @IsPositive({ message: 'Shuma e pagesës tjetër duhet të jetë pozitive' })
  nextPaymentAmount?: number;
}
