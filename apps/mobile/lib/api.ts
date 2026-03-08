import type {
  User,
  LoginDto,
  RegisterDto,
  AuthResponse,
  Expense,
  CreateExpenseDto,
  UpdateExpenseDto,
} from "shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function normalizeApiError(raw: unknown, fallback: string): string {
  if (!raw) return fallback;

  // If it's a string, try to parse JSON first; otherwise use as-is.
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizeApiError(parsed, fallback);
    } catch {
      return raw || fallback;
    }
  }

  if (typeof raw !== "object" || raw === null) {
    return fallback;
  }

  const data = raw as any;
  const messages: string[] = [];

  if (Array.isArray(data.message)) {
    messages.push(...data.message);
  } else if (typeof data.message === "string") {
    messages.push(data.message);
  }

  if (Array.isArray(data.errors)) {
    messages.push(...data.errors);
  }

  if (messages.length === 0) return fallback;

  // Map some common technical validation messages to friendlier copy.
  const friendly = messages.map((msg) => {
    if (msg.includes("email must be an email")) {
      return "Please enter a valid email address.";
    }
    if (msg.includes("password must be longer than or equal to 6 characters")) {
      return "Your password must be at least 6 characters long.";
    }
    return msg;
  });

  // Join multiple messages with newlines so UI can render them as a list.
  return friendly.join("\n");
}

async function throwFriendlyError(
  res: Response,
  fallbackMessage: string,
): Promise<never> {
  const text = await res.text();
  const message = normalizeApiError(text, fallbackMessage);
  throw new Error(message);
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_URL}/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function registerUser(data: RegisterDto): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwFriendlyError(res as any, "Registration failed");
  }
  return res.json();
}

export async function loginUser(data: LoginDto): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwFriendlyError(res as any, "Login failed");
  }
  return res.json();
}

// Expense API (requires token)
export async function fetchExpenses(token: string): Promise<Expense[]> {
  const res = await fetch(`${API_URL}/expenses`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(
  token: string,
  data: CreateExpenseDto
): Promise<Expense> {
  const res = await fetch(`${API_URL}/expenses`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwFriendlyError(res as any, "Failed to add expense");
  }
  return res.json();
}

export async function updateExpense(
  token: string,
  id: string,
  data: UpdateExpenseDto
): Promise<Expense> {
  const res = await fetch(`${API_URL}/expenses/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwFriendlyError(res as any, "Failed to update expense");
  }
  return res.json();
}

export async function deleteExpense(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/expenses/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete expense");
}
