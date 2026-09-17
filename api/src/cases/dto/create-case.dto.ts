import { IsString, IsNumber, IsOptional, IsDateString, IsUUID, MaxLength, Min, Max, IsIn } from 'class-validator';

const NPL_CLASSES = ['PERFORMING', 'WATCH', 'SUBSTANDARD', 'DOUBTFUL', 'LOSS'] as const;
const STAGES = ['D1', 'D2', 'D3', 'D4', 'LEGAL', 'WRITTEN_OFF'] as const;

export class CreateCaseDto {
  // Borrower
  @IsString({ message: 'Numri personal duhet të jetë tekst' }) @MaxLength(30, { message: 'Numri personal nuk mund të kalojë 30 karaktere' }) personalId: string;
  @IsString({ message: 'Emri duhet të jetë tekst' }) @MaxLength(100, { message: 'Emri nuk mund të kalojë 100 karaktere' }) firstName: string;
  @IsString({ message: 'Mbiemri duhet të jetë tekst' }) @MaxLength(100, { message: 'Mbiemri nuk mund të kalojë 100 karaktere' }) lastName: string;
  @IsOptional() @IsDateString({}, { message: 'Data e lindjes nuk është e vlefshme' }) dateOfBirth?: string;
  @IsOptional() @IsString({ message: 'Telefoni duhet të jetë tekst' }) @MaxLength(30, { message: 'Telefoni nuk mund të kalojë 30 karaktere' }) phone1?: string;
  @IsOptional() @IsString({ message: 'Telefoni 2 duhet të jetë tekst' }) @MaxLength(30, { message: 'Telefoni 2 nuk mund të kalojë 30 karaktere' }) phone2?: string;
  @IsOptional() @IsString({ message: 'Emaili duhet të jetë tekst' }) @MaxLength(150, { message: 'Emaili nuk mund të kalojë 150 karaktere' }) email?: string;
  @IsOptional() @IsString({ message: 'Adresa duhet të jetë tekst' }) @MaxLength(255, { message: 'Adresa nuk mund të kalojë 255 karaktere' }) address?: string;
  @IsOptional() @IsString({ message: 'Qyteti duhet të jetë tekst' }) @MaxLength(100, { message: 'Qyteti nuk mund të kalojë 100 karaktere' }) city?: string;

  // Loan
  @IsString({ message: 'Numri i kredisë duhet të jetë tekst' }) @MaxLength(50, { message: 'Numri i kredisë nuk mund të kalojë 50 karaktere' }) loanNumber: string;
  @IsUUID('all', { message: 'Institucioni i zgjedhur nuk është i vlefshëm' }) institutionId: string;
  @IsNumber({}, { message: 'Shuma e financuar duhet të jetë numër' }) @Min(0.01, { message: 'Shuma e financuar duhet të jetë më e madhe se zero' }) originalLoanAmount: number;
  @IsOptional() @IsNumber({}, { message: 'Shuma e disbursuar duhet të jetë numër' }) @Min(0.01) disbursedAmount?: number;
  @IsNumber({}, { message: 'Borgji aktual duhet të jetë numër' }) @Min(0, { message: 'Borgji aktual nuk mund të jetë negativ' }) currentOutstandingBalance: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsNumber({}, { message: 'Norma e interesit duhet të jetë numër' }) @Min(0) @Max(100) interestRate?: number;
  @IsOptional() @IsString() @MaxLength(50) productType?: string;
  @IsOptional() @IsDateString({}, { message: 'Data e disbursimit nuk është e vlefshme' }) disbursementDate?: string;
  @IsOptional() @IsDateString({}, { message: 'Data e maturimit nuk është e vlefshme' }) maturityDate?: string;
  @IsOptional() @IsNumber({}, { message: 'Ditët me vonesë duhet të jenë numër' }) @Min(0) daysPastDue?: number;
  @IsOptional() @IsIn(NPL_CLASSES, { message: 'Kategoria sipas performancës nuk është e vlefshme' }) nplClassification?: string;

  // Case
  @IsOptional() @IsUUID('all', { message: 'Zyra e zgjedhur nuk është e vlefshme' }) officeId?: string;
  @IsOptional() @IsUUID('all', { message: 'Zyrtari primar nuk është i vlefshëm' }) assignedOfficerId?: string;
  @IsOptional() @IsUUID('all', { message: 'Zyrtari sekondar nuk është i vlefshëm' }) secondaryOfficerId?: string;
  @IsOptional() @IsIn(STAGES, { message: 'Kategoria sipas procedurës nuk është e vlefshme' }) collectionStage?: string;
  @IsOptional() @IsDateString({}, { message: 'Data e regjistrimit nuk është e vlefshme' }) registrationDate?: string;
}
