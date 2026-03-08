import React, { createContext, useContext, useState, ReactNode } from "react";
import type { User, LoginDto, RegisterDto } from "shared";
import * as api from "@/lib/api";
import * as oauth from "@/lib/oauth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  loginWithFacebook: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (dto: LoginDto) => {
    const { user: u, accessToken } = await api.loginUser(dto);
    setUser(u);
    setToken(accessToken);
  };

  const register = async (dto: RegisterDto) => {
    const { user: u, accessToken } = await api.registerUser(dto);
    setUser(u);
    setToken(accessToken);
  };

  const loginWithGoogle = async () => {
    const { user: u, accessToken } = await oauth.signInWithGoogle();
    setUser(u);
    setToken(accessToken);
  };

  const loginWithFacebook = async () => {
    const { user: u, accessToken } = await oauth.signInWithFacebook();
    setUser(u);
    setToken(accessToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
