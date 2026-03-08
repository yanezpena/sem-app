import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const data: any = {
      userId,
      amount: new Decimal(dto.amount),
      description: dto.description ?? null,
      category: dto.category ?? null,
    };
    if (dto.date) {
      data.date = new Date(dto.date);
    }
    const expense = await this.prisma.expense.create({
      data,
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return this.toResponse(expense);
  }

  async findAll(userId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return expenses.map((e) => this.toResponse(e));
  }

  async findOne(userId: string, id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
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
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.date !== undefined) data.date = new Date(dto.date);

    const expense = await this.prisma.expense.update({
      where: { id },
      data,
    });
    return this.toResponse(expense);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }

  private toResponse(expense: { id: string; amount: Decimal; description: string | null; category: string | null; date: Date; userId: string; createdAt: Date; updatedAt: Date }) {
    return {
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      category: expense.category,
      date: expense.date.toISOString(),
      userId: expense.userId,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}
