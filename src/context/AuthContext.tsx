import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: { nome: string; email: string; password: string; telefone?: string; funcoes?: string[]; disponibilidade?: string }) => Promise<{ pendingApproval?: boolean; message?: string }>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  allUsers: User[];
  loadAllUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => ({}),
  logout: () => {},
  switchUser: async () => {},
  refreshUser: async () => {},
  allUsers: [],
  loadAllUsers: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const loadAllUsers = useCallback(async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users);
    } catch {
      // ignore
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
      loadAllUsers();
    } catch {
      removeStoredToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadAllUsers]);

  useEffect(() => {
    // If no token exists on first load, auto-login with default admin or allow easy selection
    const token = getStoredToken();
    if (!token) {
      // Auto-authenticate as default admin for seamless immediate preview
      api.login('geovanner13@gmail.com', 'admin123')
        .then((res) => {
          setStoredToken(res.token);
          setUser(res.user);
          loadAllUsers();
        })
        .catch(() => {
          // If login fails, just set user null
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      refreshUser();
    }
  }, [refreshUser, loadAllUsers]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      setStoredToken(res.token);
      setUser(res.user);
      await loadAllUsers();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { nome: string; email: string; password: string; telefone?: string; funcoes?: string[]; disponibilidade?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      if (res.token && res.user) {
        setStoredToken(res.token);
        setUser(res.user);
        await loadAllUsers();
      }
      return { pendingApproval: res.pendingApproval, message: res.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
  };

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const res = await api.demoSwitch(userId);
      setStoredToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        switchUser,
        refreshUser,
        allUsers,
        loadAllUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
