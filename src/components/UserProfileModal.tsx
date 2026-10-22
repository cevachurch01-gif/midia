import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../services/api';
import { User, Lock, Phone, Calendar, X, Check, KeyRound } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useNotifications();

  const [nome, setNome] = useState(user?.nome || '');
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [disponibilidade, setDisponibilidade] = useState(user?.disponibilidade || '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'senha'>('perfil');

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeTab === 'senha') {
        if (!novaSenha) {
          showToast({ type: 'error', title: 'Informe a nova senha' });
          setLoading(false);
          return;
        }
        if (novaSenha.length < 6) {
          showToast({ type: 'error', title: 'A nova senha deve ter pelo menos 6 caracteres' });
          setLoading(false);
          return;
        }
        if (novaSenha !== confirmarSenha) {
          showToast({ type: 'error', title: 'As senhas não coincidem' });
          setLoading(false);
          return;
        }
      }

      await api.updateProfile({
        nome,
        telefone,
        disponibilidade,
        ...(activeTab === 'senha' ? { senhaAtual, novaSenha } : {})
      });

      await refreshUser();
      showToast({
        type: 'success',
        title: 'Sucesso',
        message: activeTab === 'senha' ? 'Senha alterada com sucesso!' : 'Perfil atualizado com sucesso!'
      });

      if (activeTab === 'senha') {
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
      }
      onClose();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao salvar', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-zinc-100">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Minha Conta & Senha</h3>
              <p className="text-[11px] text-zinc-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
              activeTab === 'perfil'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Dados Pessoais
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('senha')}
            className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'senha'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Alterar Senha</span>
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
          {activeTab === 'perfil' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Disponibilidade Habitual</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={disponibilidade}
                    onChange={(e) => setDisponibilidade(e.target.value)}
                    placeholder="Ex: Domingos noite, quintas..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400 block mb-2">Instalação no Celular:</span>
                <PWAInstallButton variant="banner" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Senha Atual (se possuir)</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Sua senha atual"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nova Senha *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Confirmar Nova Senha *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
