import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, CheckCheck, Calendar, ArrowRightLeft, CheckSquare, MessageSquare, ShoppingCart, Info, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export const NotificationModal: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const { notificacoes, unreadCount, markLida, markTodasLidas } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'escala':
      case 'culto':
        return <Calendar className="w-4 h-4 text-indigo-400" />;
      case 'troca':
        return <ArrowRightLeft className="w-4 h-4 text-amber-400" />;
      case 'tarefa':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'sugestao':
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'compra':
        return <ShoppingCart className="w-4 h-4 text-sky-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleItemClick = (notif: (typeof notificacoes)[0]) => {
    markLida(notif.id);
    if (notif.link && onNavigate) {
      const cleanTab = notif.link.replace('/', '');
      onNavigate(cleanTab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden mt-12 sm:mt-8">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-zinc-100 text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500 text-white">
                {unreadCount} novas
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markTodasLidas}
                title="Marcar todas como lidas"
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-indigo-400 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Marcar lidas</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto divide-y divide-zinc-800/60 p-1">
          {notificacoes.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nenhuma notificação no momento.
            </div>
          ) : (
            notificacoes.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3 cursor-pointer rounded-xl transition-all flex items-start gap-3 ${
                  n.lida
                    ? 'hover:bg-zinc-800/40 text-zinc-400'
                    : 'bg-indigo-950/20 hover:bg-indigo-950/30 text-zinc-200 border border-indigo-500/20'
                }`}
              >
                <div className="p-2 rounded-lg bg-zinc-800/80 shrink-0 mt-0.5">
                  {getIcon(n.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={`text-xs font-semibold truncate ${n.lida ? 'text-zinc-300' : 'text-indigo-300 font-bold'}`}>
                      {n.titulo}
                    </h4>
                    {!n.lida && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-snug">{n.mensagem}</p>
                  <span className="text-[10px] text-zinc-400 block mt-1.5">
                    {new Date(n.criadaEm).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
