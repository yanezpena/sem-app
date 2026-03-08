export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string | null;
  receiptUrl: string | null;
  date: string;
  userId: string;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  amount: number;
  description?: string;
  receiptUrl?: string;
  categoryId?: string;
  date?: string;
}

export interface UpdateExpenseDto {
  amount?: number;
  description?: string;
  receiptUrl?: string | null;
  categoryId?: string;
  date?: string;
}

export interface ExpenseQueryDto {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
