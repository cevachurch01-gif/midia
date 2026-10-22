import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { SolicitacaoTroca, User } from '../types';
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Check,
  X,
  User as UserIcon,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';

export const TrocasView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';

  const [trocas, setTrocas] = useState<SolicitacaoTroca[]>([]);
  const [voluntarios, setVoluntarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modals for admin approval / rejection
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeTroca, setActiveTroca] = useState<SolicitacaoTroca | null>(null);
  const [substitutoFinalId, setSubstitutoFinalId] = useState('');
  const [respostaAdmin, setRespostaAdmin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Volunteer Edit / Cancel Trade modal
  const [editTrocaModalOpen, setEditTrocaModalOpen] = useState(false);
  const [editMotivo, setEditMotivo] = useState('');
  const [editSubstitutoId, setEditSubstitutoId] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [trocasData, usersData] = await Promise.all([api.getTrocas(), api.getUsers()]);
      setTrocas(trocasData);
      setVoluntarios(usersData.filter((u) => u.status === 'ativo'));
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar solicitações de troca' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenApprove = (troca: SolicitacaoTroca) => {
    setActiveTroca(troca);
    setSubstitutoFinalId(troca.substitutoSugeridoId || '');
    setRespostaAdmin('Substituição aprovada com sucesso.');
    setApproveModalOpen(true);
  };

  const handleOpenReject = (troca: SolicitacaoTroca) => {
    setActiveTroca(troca);
    setRespostaAdmin('Infelizmente não foi possível aprovar esta troca devido à indisponibilidade de substitutos qualificados para o horário.');
    setRejectModalOpen(true);
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTroca) return;
    setSubmitting(true);
    try {
      await api.aprovarTroca(activeTroca.id, {
        substitutoFinalId: substitutoFinalId || undefined,
        respostaAdmin
      });
      showToast({
        type: 'success',
        title: 'Troca Aprovada!',
        message: 'A escala foi atualizada e os voluntários envolvidos foram notificados.'
      });
      setApproveModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao aprovar', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTroca) return;
    setSubmitting(true);
    try {
      await api.rejeitarTroca(activeTroca.id, respostaAdmin);
      showToast({
        type: 'warning',
        title: 'Troca Rejeitada',
        message: 'O voluntário solicitante foi informado da decisão.'
      });
      setRejectModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao rejeitar', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditTroca = (troca: SolicitacaoTroca) => {
    setActiveTroca(troca);
    setEditMotivo(troca.motivo);
    setEditSubstitutoId(troca.substitutoSugeridoId || '');
    setEditTrocaModalOpen(true);
  };

  const handleSaveEditTroca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTroca) return;
    setSubmitting(true);
    try {
      await api.editarTroca(activeTroca.id, {
        motivo: editMotivo,
        substitutoSugeridoId: editSubstitutoId || undefined
      });
      showToast({
        type: 'success',
        title: 'Pedido Atualizado',
        message: 'As alterações na sua solicitação de troca foram salvas.'
      });
      setEditTrocaModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao atualizar', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancelarTroca = async (troca: SolicitacaoTroca) => {
    if (!confirm('Deseja realmente cancelar este pedido de troca? Sua escala voltará a ficar como confirmada.')) {
      return;
    }
    try {
      await api.cancelarTroca(troca.id);
      showToast({
        type: 'info',
        title: 'Pedido Cancelado',
        message: 'A solicitação de troca foi excluída e sua escala voltou para confirmada.'
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao cancelar troca', message: err.message });
    }
  };

  const filteredTrocas = trocas.filter((t) => {
    if (statusFilter === 'todos') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Trocas de Escala & Justificativas
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            {isAdmin
              ? 'Analise pedidos de troca, confirme substitutos e mantenha a cobertura das funções.'
              : 'Acompanhe suas solicitações de troca e pedidos em que você foi sugerido.'}
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['todos', 'pendente', 'aprovada', 'rejeitada'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize shrink-0 transition-all ${
              statusFilter === st
                ? 'bg-zinc-100 text-zinc-900 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {st === 'todos' ? 'Todas' : st}
          </button>
        ))}
      </div>

      {/* Trocas List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
        </div>
      ) : filteredTrocas.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <ArrowRightLeft className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-300">Nenhuma solicitação de troca encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrocas.map((troca) => {
            const isPendente = troca.status === 'pendente';
            return (
              <div
                key={troca.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isPendente
                    ? 'bg-zinc-900/90 border-amber-500/30 shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">{troca.solicitanteNome}</span>
                      <span className="text-xs text-zinc-500">•</span>
                      <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {troca.funcaoNome}
                      </span>

                      {/* Status badge */}
                      {troca.status === 'pendente' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Aguardando Análise
                        </span>
                      )}
                      {troca.status === 'aprovada' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Aprovada
                        </span>
                      )}
                      {troca.status === 'rejeitada' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Rejeitada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {troca.cultoTitulo} ({new Date(troca.cultoData + 'T00:00:00').toLocaleDateString('pt-BR')})
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        Pedido em {new Date(troca.dataSolicitacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Justificativa / Motivo */}
                    <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-300">
                      <span className="text-zinc-500 font-semibold block mb-0.5">Motivo informado:</span>
                      <p className="leading-relaxed">{troca.motivo}</p>
                    </div>

                    {/* Substituto sugerido / final */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {troca.substitutoSugeridoNome && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Sugerido pelo voluntário:</span>
                          <span className="font-semibold text-zinc-200">{troca.substitutoSugeridoNome}</span>
                        </div>
                      )}

                      {troca.substitutoFinalNome && (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Substituto confirmado:</span>
                          <span className="font-bold text-white">{troca.substitutoFinalNome}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Response Note */}
                    {troca.respostaAdmin && (
                      <div className="text-xs text-zinc-400 italic pt-1">
                        Resposta da Coordenação: "{troca.respostaAdmin}"
                      </div>
                    )}
                  </div>

                  {/* Admin Action Buttons */}
                  {isAdmin && isPendente && (
                    <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800">
                      <button
                        onClick={() => handleOpenApprove(troca)}
                        className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Aprovar Troca</span>
                      </button>

                      <button
                        onClick={() => handleOpenReject(troca)}
                        className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-semibold text-xs border border-zinc-700 transition-all"
                      >
                        <X className="w-4 h-4" />
                        <span>Recusar</span>
                      </button>
                    </div>
                  )}

                  {/* Volunteer Action Buttons (Requester can edit or cancel) */}
                  {!isAdmin && isPendente && troca.solicitanteId === user?.id && (
                    <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800">
                      <button
                        onClick={() => handleOpenEditTroca(troca)}
                        className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar Motivo</span>
                      </button>

                      <button
                        onClick={() => handleConfirmCancelarTroca(troca)}
                        className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-semibold text-xs border border-zinc-700 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Pedido</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Aprovar Troca */}
      {approveModalOpen && activeTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Aprovar Troca de Escala</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Ao aprovar, a escala do culto será atualizada com o novo voluntário e ambos receberão notificação.
            </p>

            <form onSubmit={handleConfirmApprove} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Voluntário Substituto *</label>
                <select
                  value={substitutoFinalId}
                  onChange={(e) => setSubstitutoFinalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  <option value="">Selecione o substituto confirmado...</option>
                  {voluntarios
                    .filter((v) => v.id !== activeTroca.solicitanteId)
                    .map((vol) => (
                      <option key={vol.id} value={vol.id}>
                        {vol.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Mensagem ou Observação</label>
                <textarea
                  rows={2}
                  value={respostaAdmin}
                  onChange={(e) => setRespostaAdmin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
                >
                  {submitting ? 'Salvando...' : 'Confirmar e Atualizar Escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Rejeitar Troca */}
      {rejectModalOpen && activeTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Rejeitar Troca</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Explique o motivo para o voluntário solicitante.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Motivo da Recusa *</label>
                <textarea
                  required
                  rows={3}
                  value={respostaAdmin}
                  onChange={(e) => setRespostaAdmin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Salvando...' : 'Rejeitar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Voluntário Editar Pedido de Troca */}
      {editTrocaModalOpen && activeTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Editar Solicitação de Troca</h3>
            <p className="text-xs text-zinc-400 mb-4">
              {activeTroca.cultoTitulo} • {activeTroca.funcaoNome} ({new Date(activeTroca.cultoData + 'T00:00:00').toLocaleDateString('pt-BR')})
            </p>

            <form onSubmit={handleSaveEditTroca} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Motivo / Justificativa *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editMotivo}
                  onChange={(e) => setEditMotivo(e.target.value)}
                  placeholder="Explique o motivo do pedido de troca..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Sugerir Voluntário Substituto (Opcional)
                </label>
                <select
                  value={editSubstitutoId}
                  onChange={(e) => setEditSubstitutoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  <option value="">Nenhum sugerido (Coordenação escolherá)</option>
                  {voluntarios
                    .filter((v) => v.id !== user?.id)
                    .map((vol) => (
                      <option key={vol.id} value={vol.id}>
                        {vol.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTrocaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
