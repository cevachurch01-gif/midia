import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Culto, EscalaItem, User, FuncaoEquipe } from '../types';
import {
  Users,
  Plus,
  Trash2,
  Copy,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  X
} from 'lucide-react';

interface Props {
  initialCultoId?: string;
}

export const EscalasView: React.FC<Props> = ({ initialCultoId }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';

  const [loading, setLoading] = useState(true);
  const [cultos, setCultos] = useState<Culto[]>([]);
  const [escalas, setEscalas] = useState<EscalaItem[]>([]);
  const [voluntarios, setVoluntarios] = useState<User[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoEquipe[]>([]);

  // Selected culto filter
  const [selectedCultoId, setSelectedCultoId] = useState<string>(initialCultoId || '');
  const [selectedVoluntarioFilter, setSelectedVoluntarioFilter] = useState<string>('todos');

  // Add Assignment Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [targetCultoId, setTargetCultoId] = useState('');
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
  const [selectedFuncaoId, setSelectedFuncaoId] = useState('');
  const [observacaoEscala, setObservacaoEscala] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Copy Roster Modal
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [origemCultoId, setOrigemCultoId] = useState('');
  const [destinoCultoId, setDestinoCultoId] = useState('');

  // Delete Confirmation Modal (avoids window.confirm blocking in iframes)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; voluntarioNome: string; funcaoNome: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cultosData, escalasList, usersList, configData] = await Promise.all([
        api.getCultos(),
        api.getEscalas(),
        api.getUsers(),
        api.getConfig()
      ]);

      setCultos(cultosData);
      setEscalas(escalasList);
      setVoluntarios(usersList.filter((u) => u.status !== 'inativo'));
      setFuncoes(configData.funcoes);

      if (!selectedCultoId && cultosData.length > 0) {
        // Find nearest future service
        const todayStr = new Date().toISOString().split('T')[0];
        const future = cultosData.find((c) => c.data >= todayStr && c.status !== 'cancelado');
        setSelectedCultoId(future ? future.id : cultosData[0].id);
      }
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar escalas' });
    } finally {
      setLoading(false);
    }
  }, [selectedCultoId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCulto = cultos.find((c) => c.id === selectedCultoId);
  const escalasDoCulto = escalas.filter((e) => {
    if (selectedCultoId && e.cultoId !== selectedCultoId) return false;
    if (selectedVoluntarioFilter !== 'todos' && e.usuarioId !== selectedVoluntarioFilter) return false;
    return true;
  });

  const handleOpenAddModal = (cultoId?: string) => {
    setTargetCultoId(cultoId || selectedCultoId || (cultos[0]?.id || ''));
    setSelectedUsuarioId(voluntarios[0]?.id || '');
    setSelectedFuncaoId(funcoes[0]?.id || '');
    setObservacaoEscala('');
    setAddModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCultoId || !selectedUsuarioId || !selectedFuncaoId) {
      showToast({ type: 'warning', title: 'Preencha todos os campos obrigatórios' });
      return;
    }

    const funcaoObj = funcoes.find((f) => f.id === selectedFuncaoId);
    setSubmitting(true);
    try {
      await api.createEscala({
        cultoId: targetCultoId,
        usuarioId: selectedUsuarioId,
        funcaoId: selectedFuncaoId,
        funcaoNome: funcaoObj?.nome,
        observacao: observacaoEscala
      });
      showToast({ type: 'success', title: 'Voluntário escalado com sucesso!' });
      setAddModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Não foi possível escalar', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = (id: string, voluntarioNome: string, funcaoNome: string) => {
    setDeleteConfirmModal({ id, voluntarioNome, funcaoNome });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return;
    setDeleting(true);
    try {
      await api.deleteEscala(deleteConfirmModal.id);
      showToast({ type: 'success', title: 'Voluntário removido da escala com sucesso!' });
      setDeleteConfirmModal(null);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao remover escala', message: err?.message });
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origemCultoId || !destinoCultoId) return;
    try {
      const res = await api.copiarEscala(origemCultoId, destinoCultoId);
      showToast({ type: 'success', title: 'Escala copiada!', message: res.message });
      setCopyModalOpen(false);
      setSelectedCultoId(destinoCultoId);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao copiar', message: err.message });
    }
  };

  const getConfirmationBadge = (status: EscalaItem['statusConfirmacao']) => {
    switch (status) {
      case 'confirmado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado
          </span>
        );
      case 'indisponivel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Não poderá ir
          </span>
        );
      case 'troca_solicitada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Troca em análise
          </span>
        );
      case 'substituido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Substituído
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Pendente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Gestão de Escalas</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Distribua as funções para os cultos e acompanhe as respostas de presença em tempo real.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOrigemCultoId(cultos[0]?.id || '');
                setDestinoCultoId(selectedCultoId || cultos[1]?.id || '');
                setCopyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Copiar Escala</span>
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Escalar Voluntário</span>
            </button>
          </div>
        )}
      </div>

      {/* Select Culto Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Selecione o Culto para visualizar a escala
          </label>
          <select
            value={selectedCultoId}
            onChange={(e) => setSelectedCultoId(e.target.value)}
            className="w-full max-w-md px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-medium text-xs sm:text-sm focus:border-indigo-500"
          >
            {cultos.map((c) => (
              <option key={c.id} value={c.id}>
                {new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {c.horarioInicio} - {c.titulo} ({c.tipo})
              </option>
            ))}
          </select>
        </div>

        {/* Volunteer filter */}
        <div className="w-full md:w-64">
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Filtrar por Voluntário
          </label>
          <select
            value={selectedVoluntarioFilter}
            onChange={(e) => setSelectedVoluntarioFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
          >
            <option value="todos">Todos os voluntários</option>
            {voluntarios.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Culto Information Card */}
      {activeCulto && (
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 uppercase">{activeCulto.tipo}</span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-400 capitalize">{activeCulto.status}</span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">{activeCulto.titulo}</h3>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {activeCulto.horarioInicio} às {activeCulto.horarioTermino}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                {activeCulto.local}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-zinc-400">Total Escalados:</span>
              <p className="text-lg font-bold text-white leading-none mt-0.5">{escalasDoCulto.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Roster Table / List */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Equipe Escalada</h3>
          </div>
          <span className="text-xs text-zinc-400">{escalasDoCulto.length} posições preenchidas</span>
        </div>

        {escalasDoCulto.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-300">Nenhum voluntário escalado para este culto ainda.</p>
            {isAdmin && (
              <button
                onClick={() => handleOpenAddModal()}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
              >
                Adicionar primeiro voluntário
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {escalasDoCulto.map((escala) => {
              const voluntario = voluntarios.find((v) => v.id === escala.usuarioId);
              const funcao = funcoes.find((f) => f.id === escala.funcaoId);
              const nomeExibicao = voluntario?.nome || escala.usuarioNome || 'Voluntário';

              return (
                <div
                  key={escala.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md"
                      style={{ backgroundColor: funcao?.cor || '#6366f1' }}
                    >
                      {nomeExibicao.substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">
                          {nomeExibicao}
                        </h4>
                        {voluntario?.telefone && (
                          <span className="text-[11px] text-zinc-500 hidden md:inline">
                            {voluntario.telefone}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {escala.funcaoNome}
                        </span>
                        {escala.observacao && (
                          <span className="text-xs text-zinc-400 italic">
                            • {escala.observacao}
                          </span>
                        )}
                      </div>

                      {/* If indisponivel, show reason */}
                      {escala.statusConfirmacao === 'indisponivel' && escala.motivoIndisponibilidade && (
                        <p className="text-xs text-rose-300 mt-1 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                          Motivo: {escala.motivoIndisponibilidade}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-800">
                    <div>{getConfirmationBadge(escala.statusConfirmacao)}</div>

                    {isAdmin && (
                      <button
                        onClick={() =>
                          handleDeleteAssignment(
                            escala.id,
                            nomeExibicao,
                            escala.funcaoNome
                          )
                        }
                        title="Remover da escala"
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Escalar Voluntário with Conflict Detection */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">Escalar Voluntário</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Culto *</label>
                <select
                  required
                  value={targetCultoId}
                  onChange={(e) => setTargetCultoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  {cultos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.data} • {c.horarioInicio} - {c.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Voluntário *</label>
                <select
                  required
                  value={selectedUsuarioId}
                  onChange={(e) => setSelectedUsuarioId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  {voluntarios.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome} {v.disponibilidade ? `(${v.disponibilidade})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Função / Posto *</label>
                <select
                  required
                  value={selectedFuncaoId}
                  onChange={(e) => setSelectedFuncaoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  {funcoes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Instruções ou Observação</label>
                <input
                  type="text"
                  value={observacaoEscala}
                  onChange={(e) => setObservacaoEscala(e.target.value)}
                  placeholder="Ex: Foco no púlpito, chegar às 18h"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>
                  O sistema verifica automaticamente se o voluntário já possui outro compromisso no mesmo horário e dispara a notificação no painel dele.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  {submitting ? 'Salvando...' : 'Confirmar Escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Copy Roster from previous service */}
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Copiar Escala de Culto Anterior</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Importa os voluntários e suas funções de um culto de origem para o culto de destino.
            </p>

            <form onSubmit={handleCopyRoster} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Culto de Origem (Modelo)</label>
                <select
                  value={origemCultoId}
                  onChange={(e) => setOrigemCultoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                >
                  {cultos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.data} • {c.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Culto de Destino (Receberá a escala)</label>
                <select
                  value={destinoCultoId}
                  onChange={(e) => setDestinoCultoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                >
                  {cultos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.data} • {c.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCopyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Copiar e Notificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Exclusão de Escala */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Remover da Escala?</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Deseja desescalar <strong className="text-white">{deleteConfirmModal.voluntarioNome}</strong> da função <strong className="text-white">{deleteConfirmModal.funcaoNome}</strong> neste culto?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {deleting ? 'Removendo...' : 'Sim, Remover da Escala'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
