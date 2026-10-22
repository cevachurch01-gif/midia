import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notificacao } from '../types';
import { api, getStoredToken } from '../services/api';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface NotificationContextType {
  notificacoes: Notificacao[];
  unreadCount: number;
  refreshNotificacoes: () => Promise<void>;
  markLida: (id: string) => Promise<void>;
  markTodasLidas: () => Promise<void>;
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notificacoes: [],
  unreadCount: 0,
  refreshNotificacoes: async () => {},
  markLida: async () => {},
  markTodasLidas: async () => {},
  toasts: [],
  showToast: () => {},
  removeToast: () => {}
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refreshNotificacoes = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const list = await api.getNotificacoes();
      setNotificacoes(list);
    } catch {
      // silently ignore if not logged in
    }
  }, []);

  useEffect(() => {
    refreshNotificacoes();
    const interval = setInterval(refreshNotificacoes, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [refreshNotificacoes]);

  const markLida = async (id: string) => {
    try {
      await api.markNotificacaoLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markTodasLidas = async () => {
    try {
      await api.markTodasLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  return (
    <NotificationContext.Provider
      value={{
        notificacoes,
        unreadCount,
        refreshNotificacoes,
        markLida,
        markTodasLidas,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
