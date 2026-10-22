import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { UserCheck, Shield, User as UserIcon, X, Music2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user: currentUser, allUsers, switchUser } = useAuth();
  const { showToast } = useNotifications();

  if (!isOpen) return null;

  const handleSelect = async (userId: string, nome: string, perfil: string) => {
    try {
      await switchUser(userId);
      const perfilLabel =
        perfil === 'admin'
          ? 'Administrador Geral'
          : perfil === 'ministro_louvor'
          ? 'Ministro de Louvor'
          : 'Voluntário';
      showToast({
        type: 'info',
        title: 'Perfil alternado',
        message: `Agora você está navegando como ${nome} (${perfilLabel})`
      });
      onClose();
    } catch {
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível alternar o usuário.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm">Alternar Usuário para Demonstração</h3>
              <p className="text-xs text-zinc-400">Teste a experiência de Administrador ou Voluntário</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 max-h-[70vh] overflow-y-auto space-y-1.5">
          {allUsers.map((u) => {
            const isSelected = currentUser?.id === u.id;
            return (
              <button
                key={u.id}
                onClick={() => handleSelect(u.id, u.nome, u.perfil)}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                      u.perfil === 'admin' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {u.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-zinc-100">{u.nome}</span>
                      {u.perfil === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Shield className="w-2.5 h-2.5" /> Admin
                        </span>
                      ) : u.perfil === 'ministro_louvor' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Music2 className="w-2.5 h-2.5" /> Ministro de Louvor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                          <UserIcon className="w-2.5 h-2.5" /> Voluntário
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{u.email}</p>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-xs font-semibold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/20">
                    Ativo
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-zinc-950/60 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-400">
            Alternar de usuário permite validar permissões reais, notificações privadas e escalas individuais.
          </p>
        </div>
      </div>
    </div>
  );
};
