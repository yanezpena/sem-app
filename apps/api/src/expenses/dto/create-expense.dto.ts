import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateExpenseDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
