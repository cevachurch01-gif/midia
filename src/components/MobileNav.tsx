import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Menu,
  X,
  Bell,
  Sparkles,
  LayoutDashboard,
  Calendar,
  Users,
  ArrowRightLeft,
  Music2,
  CheckSquare,
  ShoppingCart,
  HardDrive,
  MessageSquare,
  BarChart3,
  Megaphone,
  Settings,
  ClipboardCheck,
  LogOut,
  UserCheck,
  Moon,
  Sun
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNotifications: () => void;
  onOpenUserSwitcher: () => void;
  onOpenProfile?: () => void;
  appName?: string;
  churchName?: string;
}

export const MobileNav: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenNotifications,
  onOpenUserSwitcher,
  onOpenProfile,
  appName = 'Mídia Central',
  churchName = 'Comunidade da Fé'
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = user?.perfil === 'admin';

  const volunteerLinks = [
    { id: 'meu-painel', label: 'Meu Painel', icon: LayoutDashboard },
    { id: 'escalas', label: 'Minhas Escalas', icon: Calendar },
    { id: 'trocas', label: 'Trocas', icon: ArrowRightLeft },
    { id: 'setlists', label: 'Setlists', icon: Music2 },
    { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
    { id: 'sugestoes', label: 'Sugestões', icon: MessageSquare },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone }
  ];

  const adminLinks = [
    { id: 'painel-admin', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'cultos', label: 'Cultos', icon: Calendar },
    { id: 'escalas', label: 'Escalas', icon: Users },
    { id: 'trocas', label: 'Trocas', icon: ArrowRightLeft },
    { id: 'presencas', label: 'Presenças', icon: ClipboardCheck },
    { id: 'setlists', label: 'Setlists', icon: Music2 },
    { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
    { id: 'compras', label: 'Compras & Orçamento', icon: ShoppingCart },
    { id: 'equipamentos', label: 'Equipamentos', icon: HardDrive },
    { id: 'sugestoes', label: 'Sugestões', icon: MessageSquare },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  const links = isAdmin ? adminLinks : volunteerLinks;

  // Bottom navigation quick items
  const bottomItems = isAdmin
    ? [
        { id: 'painel-admin', label: 'Painel', icon: LayoutDashboard },
        { id: 'cultos', label: 'Cultos', icon: Calendar },
        { id: 'escalas', label: 'Escalas', icon: Users },
        { id: 'trocas', label: 'Trocas', icon: ArrowRightLeft },
        { id: 'tarefas', label: 'Tarefas', icon: CheckSquare }
      ]
    : [
        { id: 'meu-painel', label: 'Painel', icon: LayoutDashboard },
        { id: 'escalas', label: 'Escalas', icon: Calendar },
        { id: 'setlists', label: 'Setlist', icon: Music2 },
        { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
        { id: 'trocas', label: 'Trocas', icon: ArrowRightLeft }
      ];

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight leading-none block">{appName}</span>
              <span className="text-[10px] text-zinc-400 font-medium block truncate max-w-[120px]">{churchName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenUserSwitcher}
            className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium flex items-center gap-1"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">{isAdmin ? 'Admin' : 'Voluntário'}</span>
          </button>

          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Full Menu) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-4/5 max-w-xs bg-zinc-950 border-r border-zinc-800 h-full flex flex-col p-4 z-10 animate-slide-right">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">{appName}</h2>
                  <p className="text-[11px] text-zinc-400">{churchName}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2">
              <PWAInstallButton variant="banner" />

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-between">
                <div
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenProfile?.();
                  }}
                  className="cursor-pointer flex-1"
                >
                  <p className="text-xs font-bold text-white hover:text-indigo-400 transition">{user?.nome}</p>
                  <p className="text-[11px] text-zinc-400 capitalize">
                    {user?.perfil === 'admin' ? 'Administrador Geral' : user?.perfil === 'ministro_louvor' ? 'Ministro de Louvor' : 'Voluntário'} • <span className="text-indigo-400 underline">Editar perfil/senha</span>
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 ml-2"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto space-y-1 py-2">
              {links.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-zinc-800">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Thumb reach for volunteers) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 px-2 py-1.5 flex items-center justify-around">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all ${
                isActive
                  ? 'text-indigo-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
