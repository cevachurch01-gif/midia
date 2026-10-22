import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Sparkles, Shield, User as UserIcon, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface Props {
  onGoToRegister: () => void;
}

export const LoginView: React.FC<Props> = ({ onGoToRegister }) => {
  const { login, switchUser } = useAuth();
  const { showToast } = useNotifications();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast({ type: 'success', title: 'Login realizado com sucesso!' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Falha no login', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (userId: string, nome: string) => {
    setLoading(true);
    try {
      await switchUser(userId);
      showToast({ type: 'info', title: `Entrando como ${nome}...` });
    } catch {
      showToast({ type: 'error', title: 'Erro ao entrar com usuário demo' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {/* PWA Direct Mobile Banner */}
        <PWAInstallButton variant="banner" />

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Mídia Central</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Sistema de Gestão da Equipe de Mídia da Igreja
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@igreja.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Entrando...' : 'Acessar Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fast Access */}
          <div className="pt-4 border-t border-zinc-800/80">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block text-center mb-2.5">
              Acesso Rápido para Avaliação
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('usr-admin-1', 'Geovanner (Admin)')}
                className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-left transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Admin Geral</span>
                </div>
                <span className="text-[10px] text-zinc-400 block truncate">geovanner13@gmail.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('usr-lucas', 'Lucas (Voluntário)')}
                className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-left transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Voluntário</span>
                </div>
                <span className="text-[10px] text-zinc-400 block truncate">Lucas Silva (Câmera 1)</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onGoToRegister}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Não tem uma conta? Cadastre-se como voluntário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
