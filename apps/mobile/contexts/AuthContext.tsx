import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { storage } from "@/lib/storage";
import type { User, LoginDto, RegisterDto } from "shared";
import * as api from "@/lib/api";
import * as oauth from "@/lib/oauth";

const AUTH_TOKEN_KEY = "expense_tracker_token";
const AUTH_USER_KEY = "expense_tracker_user";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  loginWithFacebook: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          storage.getItem(AUTH_TOKEN_KEY),
          storage.getItem(AUTH_USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
        }
      } catch {
        // Clear invalid stored data
        await Promise.all([
          storage.removeItem(AUTH_TOKEN_KEY),
          storage.removeItem(AUTH_USER_KEY),
        ]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistAuth = useCallback(async (u: User, t: string) => {
    setUser(u);
    setToken(t);
    await Promise.all([
      storage.setItem(AUTH_TOKEN_KEY, t),
      storage.setItem(AUTH_USER_KEY, JSON.stringify(u)),
    ]);
  }, []);

  const clearAuth = useCallback(async () => {
    setUser(null);
    setToken(null);
    await Promise.all([
      storage.removeItem(AUTH_TOKEN_KEY),
      storage.removeItem(AUTH_USER_KEY),
    ]);
  }, []);

  const login = useCallback(async (dto: LoginDto) => {
    const { user: u, accessToken } = await api.loginUser(dto);
    await persistAuth(u, accessToken);
  }, [persistAuth]);

  const register = useCallback(async (dto: RegisterDto) => {
    const { user: u, accessToken } = await api.registerUser(dto);
    await persistAuth(u, accessToken);
  }, [persistAuth]);

  const loginWithGoogle = useCallback(async () => {
    const { user: u, accessToken } = await oauth.signInWithGoogle();
    await persistAuth(u, accessToken);
  }, [persistAuth]);

  const loginWithFacebook = useCallback(async () => {
    const { user: u, accessToken } = await oauth.signInWithFacebook();
    await persistAuth(u, accessToken);
  }, [persistAuth]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginWithGoogle,
        loginWithFacebook,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
