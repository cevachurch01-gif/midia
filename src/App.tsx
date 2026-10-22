import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { NotificationModal } from './components/NotificationModal';
import { ToastContainer } from './components/ToastContainer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { UserProfileModal } from './components/UserProfileModal';

// Views
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { VolunteerDashboard } from './views/VolunteerDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { CultosView } from './views/CultosView';
import { EscalasView } from './views/EscalasView';
import { TrocasView } from './views/TrocasView';
import { PresencasView } from './views/PresencasView';
import { SetlistsView } from './views/SetlistsView';
import { TarefasView } from './views/TarefasView';
import { ComprasOrcamentoView } from './views/ComprasOrcamentoView';
import { EquipamentosView } from './views/EquipamentosView';
import { SugestoesView } from './views/SugestoesView';
import { RelatoriosView } from './views/RelatoriosView';
import { ComunicadosView } from './views/ComunicadosView';
import { ConfiguracoesView } from './views/ConfiguracoesView';

import { Bell, Sparkles } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { unreadCount } = useNotifications();

  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>('meu-painel');
  const [selectedCultoForEscalas, setSelectedCultoForEscalas] = useState<string | undefined>();
  const [userSwitcherOpen, setUserSwitcherOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);

  // Sync initial tab based on role
  useEffect(() => {
    if (user) {
      if (user.perfil === 'admin') {
        setActiveTab((prev) => (prev === 'meu-painel' ? 'painel-admin' : prev));
      } else {
        setActiveTab((prev) => (prev === 'painel-admin' ? 'meu-painel' : prev));
      }
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Carregando Mídia Central...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return (
        <>
          <ToastContainer />
          <RegisterView onGoToLogin={() => setAuthView('login')} />
        </>
      );
    }
    return (
      <>
        <ToastContainer />
        <LoginView onGoToRegister={() => setAuthView('register')} />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'painel-admin':
        return <AdminDashboard onNavigate={setActiveTab} />;
      case 'meu-painel':
        return <VolunteerDashboard onNavigate={setActiveTab} />;
      case 'cultos':
        return (
          <CultosView
            onNavigateToEscalas={(cultoId) => {
              setSelectedCultoForEscalas(cultoId);
              setActiveTab('escalas');
            }}
          />
        );
      case 'escalas':
        return <EscalasView initialCultoId={selectedCultoForEscalas} />;
      case 'trocas':
        return <TrocasView />;
      case 'presencas':
        return <PresencasView />;
      case 'setlists':
        return <SetlistsView />;
      case 'tarefas':
        return <TarefasView />;
      case 'compras':
        return <ComprasOrcamentoView />;
      case 'equipamentos':
        return <EquipamentosView />;
      case 'sugestoes':
        return <SugestoesView />;
      case 'relatorios':
        return <RelatoriosView />;
      case 'comunicados':
        return <ComunicadosView />;
      case 'configuracoes':
        return <ConfiguracoesView />;
      default:
        return user.perfil === 'admin' ? (
          <AdminDashboard onNavigate={setActiveTab} />
        ) : (
          <VolunteerDashboard onNavigate={setActiveTab} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row antialiased selection:bg-indigo-600 selection:text-white">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUserSwitcher={() => setUserSwitcherOpen(true)}
        onOpenProfile={() => setUserProfileOpen(true)}
      />

      {/* Mobile Top Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenUserSwitcher={() => setUserSwitcherOpen(true)}
        onOpenProfile={() => setUserProfileOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {user.perfil === 'admin' ? 'Módulo Administrativo' : 'Painel do Voluntário'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* PWA Install Button */}
            <PWAInstallButton variant="badge" />

            {/* Notifications Bell */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic View Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </div>
      </main>

      {/* Modals & Alerts */}
      <UserProfileModal
        isOpen={userProfileOpen}
        onClose={() => setUserProfileOpen(false)}
      />

      <UserSwitcherModal
        isOpen={userSwitcherOpen}
        onClose={() => setUserSwitcherOpen(false)}
      />

      <NotificationModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigate={setActiveTab}
      />

      <OfflineIndicator />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
