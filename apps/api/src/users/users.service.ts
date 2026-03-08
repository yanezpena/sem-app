import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

type UserWithoutPassword = Omit<User, 'hashedPassword'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserWithoutPassword[]> {
    // we intentionally omit the password hash from the results
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<UserWithoutPassword[]>;
  }

  async findByEmail(email: string): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<UserWithoutPassword | null>;
  }

  async create(data: {
    email: string;
    name?: string;
    hashedPassword: string;
  }): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (err: any) {
      if (err?.code === 'P2002' && err.meta?.target?.includes('email')) {
        // unique constraint failed
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }
}
