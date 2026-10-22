import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Sparkles, ArrowLeft, ArrowRight, User as UserIcon, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface Props {
  onGoToLogin: () => void;
}

export const RegisterView: React.FC<Props> = ({ onGoToLogin }) => {
  const { register } = useAuth();
  const { showToast } = useNotifications();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [disponibilidade, setDisponibilidade] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast({ type: 'error', title: 'Senhas diferentes', message: 'A confirmação de senha não confere.' });
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        nome,
        email,
        password,
        telefone,
        disponibilidade
      });

      if (result.pendingApproval) {
        showToast({
          type: 'warning',
          title: 'Cadastro Realizado!',
          message: 'Aguarde a aprovação do administrador para acessar suas escalas.'
        });
        onGoToLogin();
      } else {
        showToast({
          type: 'success',
          title: 'Bem-vindo à Equipe de Mídia!',
          message: 'Seu cadastro foi realizado com sucesso.'
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro no cadastro', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {/* PWA Direct Mobile Banner */}
        <PWAInstallButton variant="banner" />

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Cadastro de Voluntário</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Junte-se à equipe de mídia da igreja
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nome Completo *</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  required
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">E-mail *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Senha Segura *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Confirmar Senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">WhatsApp / Telefone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Disponibilidade</label>
              <input
                type="text"
                value={disponibilidade}
                onChange={(e) => setDisponibilidade(e.target.value)}
                placeholder="Ex: Domingos à noite, quartas-feiras..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Cadastrando...' : 'Concluir Cadastro'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Já possui conta? Fazer login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
