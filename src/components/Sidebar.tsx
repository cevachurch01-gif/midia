import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import {
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
  Sun,
  Moon,
  LogOut,
  UserCheck,
  Sparkles,
  Shield
} from 'lucide-react';

import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUserSwitcher: () => void;
  onOpenProfile?: () => void;
  appName?: string;
  churchName?: string;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenUserSwitcher,
  onOpenProfile,
  appName = 'Mídia Central',
  churchName = 'Comunidade da Fé'
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const isAdmin = user?.perfil === 'admin';

  const volunteerLinks = [
    { id: 'meu-painel', label: 'Meu Painel', icon: LayoutDashboard },
    { id: 'escalas', label: 'Minhas Escalas', icon: Calendar },
    { id: 'trocas', label: 'Trocas & Justificativas', icon: ArrowRightLeft },
    { id: 'setlists', label: 'Setlists & Músicas', icon: Music2 },
    { id: 'tarefas', label: 'Minhas Tarefas', icon: CheckSquare },
    { id: 'sugestoes', label: 'Sugestões & Pedidos', icon: MessageSquare },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone }
  ];

  const adminLinks = [
    { id: 'painel-admin', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'cultos', label: 'Cultos & Programação', icon: Calendar },
    { id: 'escalas', label: 'Gestão de Escalas', icon: Users },
    { id: 'trocas', label: 'Trocas & Justificativas', icon: ArrowRightLeft },
    { id: 'presencas', label: 'Presenças Pós-Culto', icon: ClipboardCheck },
    { id: 'setlists', label: 'Setlists & Louvor', icon: Music2 },
    { id: 'tarefas', label: 'Quadro de Tarefas', icon: CheckSquare },
    { id: 'compras', label: 'Compras & Orçamento', icon: ShoppingCart },
    { id: 'equipamentos', label: 'Equipamentos', icon: HardDrive },
    { id: 'sugestoes', label: 'Central de Sugestões', icon: MessageSquare },
    { id: 'relatorios', label: 'Relatórios & Dados', icon: BarChart3 },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  const navLinks = isAdmin ? adminLinks : volunteerLinks;

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950 text-zinc-300 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white leading-tight">{appName}</h1>
            <p className="text-[11px] text-zinc-400 font-medium truncate max-w-[130px]">{churchName}</p>
          </div>
        </div>
      </div>

      {/* User Switcher Quick Banner (Great for testing/demo) */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenUserSwitcher}
          className="w-full px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-2 truncate">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="truncate">Alternar Perfil Demo</span>
          </div>
          <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-200">
            {isAdmin ? 'Admin' : 'Voluntário'}
          </span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
          {isAdmin ? 'Módulos Administrativos' : 'Área do Voluntário'}
        </div>

        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'comunicados' && unreadCount > 0 && !isAdmin && (
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Current User & Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 space-y-2">
        <PWAInstallButton variant="banner" className="mb-1" />

        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800/80">
          <div
            onClick={onOpenProfile}
            title="Editar Meu Perfil & Senha"
            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 hover:opacity-85 transition"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-800 text-indigo-400 font-bold text-xs flex items-center justify-center border border-zinc-700 shrink-0">
              {user?.nome ? user.nome.substring(0, 2).toUpperCase() : 'MC'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user?.nome}</p>
              <div className="flex items-center gap-1">
                {isAdmin ? (
                  <span className="text-[10px] font-medium text-indigo-400 flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" /> Administrador
                  </span>
                ) : user?.perfil === 'ministro_louvor' ? (
                  <span className="text-[10px] font-medium text-purple-400 flex items-center gap-0.5">
                    <Music2 className="w-2.5 h-2.5" /> Ministro de Louvor
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400">Voluntário</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-zinc-400">Tema</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Escuro</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Claro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
