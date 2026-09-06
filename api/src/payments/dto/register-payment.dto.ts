import { IsString, IsNumber, IsPositive, IsDateString, IsOptional, IsIn, IsUUID, MaxLength } from 'class-validator';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHECK', 'CARD', 'OTHER'] as const;

export class RegisterPaymentDto {
  @IsUUID()
  caseId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  paymentDate: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalReference?: string;
}
