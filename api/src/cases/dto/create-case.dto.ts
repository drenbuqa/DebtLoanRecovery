import { IsString, IsNumber, IsOptional, IsDateString, IsUUID, MaxLength, Min, Max, IsIn } from 'class-validator';

const NPL_CLASSES = ['PERFORMING', 'WATCH', 'SUBSTANDARD', 'DOUBTFUL', 'LOSS'] as const;
const STAGES = ['D1', 'D2', 'D3', 'LEGAL', 'WRITTEN_OFF'] as const;

export class CreateCaseDto {
  // Borrower
  @IsString() @MaxLength(20) personalId: string;
  @IsString() @MaxLength(100) firstName: string;
  @IsString() @MaxLength(100) lastName: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(20) phone1?: string;
  @IsOptional() @IsString() @MaxLength(20) phone2?: string;
  @IsOptional() @IsString() @MaxLength(150) email?: string;
  @IsOptional() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;

  // Loan
  @IsString() @MaxLength(50) loanNumber: string;
  @IsUUID() institutionId: string;
  @IsNumber() @Min(0.01) originalLoanAmount: number;
  @IsNumber() @Min(0.01) disbursedAmount: number;
  @IsNumber() @Min(0) currentOutstandingBalance: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) interestRate?: number;
  @IsOptional() @IsString() @MaxLength(50) productType?: string;
  @IsDateString() disbursementDate: string;
  @IsOptional() @IsDateString() maturityDate?: string;
  @IsNumber() @Min(0) daysPastDue: number;
  @IsOptional() @IsIn(NPL_CLASSES) nplClassification?: string;

  // Case
  @IsOptional() @IsUUID() officeId?: string;
  @IsOptional() @IsUUID() assignedOfficerId?: string;
  @IsOptional() @IsIn(STAGES) collectionStage?: string;
}
