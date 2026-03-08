import { IsNumber, IsOptional, IsString, IsDateString, ValidateIf } from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateIf((o) => o.receiptUrl != null)
  @IsString()
  receiptUrl?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
