import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const data: any = {
      userId,
      amount: new Decimal(dto.amount),
      description: dto.description ?? null,
      receiptUrl: dto.receiptUrl ?? null,
      categoryId: dto.categoryId ?? null,
    };
    if (dto.date) {
      data.date = new Date(dto.date);
    }
    const expense = await this.prisma.expense.create({
      data,
      include: { user: { select: { id: true, email: true, name: true } }, category: true },
    });
    return this.toResponse(expense);
  }

  async findAll(userId: string, query?: ExpenseQueryDto) {
    const where: any = { userId };
    if (query?.startDate || query?.endDate || query?.categoryId) {
      if (query.startDate) {
        where.date = { ...where.date, gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.date = { ...where.date, lte: end };
      }
      if (query.categoryId) {
        where.categoryId = query.categoryId;
      }
    }
    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { category: true },
    });
    return expenses.map((e) => this.toResponse(e));
  }

  async findOne(userId: string, id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    if (expense.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.toResponse(expense);
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(userId, id);
    const data: any = {};
    if (dto.amount !== undefined) data.amount = new Decimal(dto.amount);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.receiptUrl !== undefined) data.receiptUrl = dto.receiptUrl;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.date !== undefined) data.date = new Date(dto.date);

    const expense = await this.prisma.expense.update({
      where: { id },
      data,
      include: { category: true },
    });
    return this.toResponse(expense);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }

  private toResponse(expense: {
    id: string;
    amount: Decimal;
    description: string | null;
    receiptUrl: string | null;
    date: Date;
    userId: string;
    categoryId: string | null;
    category: { id: string; name: string; slug: string } | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      receiptUrl: expense.receiptUrl,
      date: expense.date.toISOString(),
      userId: expense.userId,
      categoryId: expense.categoryId,
      category: expense.category,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}
