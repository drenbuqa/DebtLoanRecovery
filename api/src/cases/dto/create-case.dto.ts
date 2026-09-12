import { IsString, IsNumber, IsOptional, IsDateString, IsUUID, MaxLength, Min, Max, IsIn } from 'class-validator';

const NPL_CLASSES = ['PERFORMING', 'WATCH', 'SUBSTANDARD', 'DOUBTFUL', 'LOSS'] as const;
const STAGES = ['D1', 'D2', 'D3', 'LEGAL', 'WRITTEN_OFF'] as const;

export class CreateCaseDto {
  // Borrower
  @IsString({ message: 'Numri personal duhet të jetë tekst' }) @MaxLength(20, { message: 'Numri personal nuk mund të kalojë 20 karaktere' }) personalId: string;
  @IsString({ message: 'Emri duhet të jetë tekst' }) @MaxLength(100, { message: 'Emri nuk mund të kalojë 100 karaktere' }) firstName: string;
  @IsString({ message: 'Mbiemri duhet të jetë tekst' }) @MaxLength(100, { message: 'Mbiemri nuk mund të kalojë 100 karaktere' }) lastName: string;
  @IsOptional() @IsDateString({}, { message: 'Data e lindjes nuk është e vlefshme' }) dateOfBirth?: string;
  @IsOptional() @IsString({ message: 'Telefoni duhet të jetë tekst' }) @MaxLength(20, { message: 'Telefoni nuk mund të kalojë 20 karaktere' }) phone1?: string;
  @IsOptional() @IsString({ message: 'Telefoni 2 duhet të jetë tekst' }) @MaxLength(20, { message: 'Telefoni 2 nuk mund të kalojë 20 karaktere' }) phone2?: string;
  @IsOptional() @IsString({ message: 'Emaili duhet të jetë tekst' }) @MaxLength(150, { message: 'Emaili nuk mund të kalojë 150 karaktere' }) email?: string;
  @IsOptional() @IsString({ message: 'Adresa duhet të jetë tekst' }) @MaxLength(200, { message: 'Adresa nuk mund të kalojë 200 karaktere' }) address?: string;
  @IsOptional() @IsString({ message: 'Qyteti duhet të jetë tekst' }) @MaxLength(100, { message: 'Qyteti nuk mund të kalojë 100 karaktere' }) city?: string;

  // Loan
  @IsString({ message: 'Numri i kredisë duhet të jetë tekst' }) @MaxLength(50, { message: 'Numri i kredisë nuk mund të kalojë 50 karaktere' }) loanNumber: string;
  @IsUUID('4', { message: 'Institucioni i zgjedhur nuk është i vlefshëm' }) institutionId: string;
  @IsNumber({}, { message: 'Shuma origjinale duhet të jetë numër' }) @Min(0.01, { message: 'Shuma origjinale duhet të jetë më e madhe se zero' }) originalLoanAmount: number;
  @IsNumber({}, { message: 'Shuma e disbursuar duhet të jetë numër' }) @Min(0.01, { message: 'Shuma e disbursuar duhet të jetë më e madhe se zero' }) disbursedAmount: number;
  @IsNumber({}, { message: 'Gjendja aktuale duhet të jetë numër' }) @Min(0, { message: 'Gjendja aktuale nuk mund të jetë negative' }) currentOutstandingBalance: number;
  @IsOptional() @IsString({ message: 'Monedha duhet të jetë tekst' }) @MaxLength(3, { message: 'Monedha nuk mund të kalojë 3 karaktere' }) currency?: string;
  @IsOptional() @IsNumber({}, { message: 'Norma e interesit duhet të jetë numër' }) @Min(0, { message: 'Norma e interesit nuk mund të jetë negative' }) @Max(100, { message: 'Norma e interesit nuk mund të kalojë 100%' }) interestRate?: number;
  @IsOptional() @IsString({ message: 'Lloji i produktit duhet të jetë tekst' }) @MaxLength(50, { message: 'Lloji i produktit nuk mund të kalojë 50 karaktere' }) productType?: string;
  @IsDateString({}, { message: 'Data e disbursimit nuk është e vlefshme' }) disbursementDate: string;
  @IsOptional() @IsDateString({}, { message: 'Data e maturimit nuk është e vlefshme' }) maturityDate?: string;
  @IsNumber({}, { message: 'Ditët me vonesë duhet të jenë numër' }) @Min(0, { message: 'Ditët me vonesë nuk mund të jenë negative' }) daysPastDue: number;
  @IsOptional() @IsIn(NPL_CLASSES, { message: 'Klasifikimi NPL nuk është i vlefshëm' }) nplClassification?: string;

  // Case
  @IsOptional() @IsUUID('4', { message: 'Zyra e zgjedhur nuk është e vlefshme' }) officeId?: string;
  @IsOptional() @IsUUID('4', { message: 'Oficeri i zgjedhur nuk është i vlefshëm' }) assignedOfficerId?: string;
  @IsOptional() @IsIn(STAGES, { message: 'Faza e arkëtimit nuk është e vlefshme' }) collectionStage?: string;
}
