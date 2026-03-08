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

export interface Expense {
  id: string;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  amount: number;
  description?: string;
  category?: string;
  date?: string;
}

export interface UpdateExpenseDto {
  amount?: number;
  description?: string;
  category?: string;
  date?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
