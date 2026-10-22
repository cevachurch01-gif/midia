import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Tarefa, TarefaStatus, TarefaPrioridade, User } from '../types';
import {
  CheckSquare,
  Plus,
  Calendar,
  MessageSquare,
  User as UserIcon,
  X,
  Send
} from 'lucide-react';

export const TarefasView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [voluntarios, setVoluntarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

  // New Task Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formResponsavelId, setFormResponsavelId] = useState('');
  const [formPrazo, setFormPrazo] = useState('');
  const [formPrioridade, setFormPrioridade] = useState<TarefaPrioridade>('media');
  const [formCategoria, setFormCategoria] = useState('Geral');
  const [submitting, setSubmitting] = useState(false);

  // Detail / Comments Modal
  const [detailTarefa, setDetailTarefa] = useState<Tarefa | null>(null);
  const [newComentario, setNewComentario] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [tarefasList, usersList] = await Promise.all([api.getTarefas(), api.getUsers()]);
      setTarefas(tarefasList);
      setVoluntarios(usersList.filter((u) => u.status === 'ativo'));
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar tarefas' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo || !formPrazo) return;
    setSubmitting(true);
    try {
      await api.createTarefa({
        titulo: formTitulo,
        descricao: formDescricao,
        responsavelId: formResponsavelId || undefined,
        prazo: formPrazo,
        prioridade: formPrioridade,
        categoria: formCategoria
      });
      showToast({ type: 'success', title: 'Tarefa criada com sucesso!' });
      setCreateModalOpen(false);
      setFormTitulo('');
      setFormDescricao('');
      setFormPrazo('');
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao criar tarefa' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveStatus = async (tarefaId: string, novoStatus: TarefaStatus) => {
    try {
      await api.updateTarefa(tarefaId, { status: novoStatus });
      setTarefas((prev) =>
        prev.map((t) => (t.id === tarefaId ? { ...t, status: novoStatus } : t))
      );
      if (detailTarefa?.id === tarefaId) {
        setDetailTarefa((prev) => (prev ? { ...prev, status: novoStatus } : null));
      }
      showToast({ type: 'success', title: 'Status da tarefa atualizado' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Não foi possível mover a tarefa', message: err.message });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTarefa || !newComentario.trim()) return;
    try {
      const updated = await api.addComentarioTarefa(detailTarefa.id, newComentario);
      setDetailTarefa(updated);
      setTarefas((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setNewComentario('');
      showToast({ type: 'success', title: 'Comentário adicionado' });
    } catch {
      showToast({ type: 'error', title: 'Erro ao adicionar comentário' });
    }
  };

  const kanbanColumns: { id: TarefaStatus; title: string; color: string }[] = [
    { id: 'a_fazer', title: 'A Fazer', color: 'border-zinc-700 bg-zinc-950/40 text-zinc-300' },
    { id: 'em_andamento', title: 'Em Andamento', color: 'border-blue-500/30 bg-blue-950/10 text-blue-300' },
    { id: 'aguardando', title: 'Aguardando', color: 'border-amber-500/30 bg-amber-950/10 text-amber-300' },
    { id: 'concluida', title: 'Concluída', color: 'border-emerald-500/30 bg-emerald-950/10 text-emerald-300' }
  ];

  const getPriorityBadge = (p: TarefaPrioridade) => {
    const map: Record<string, string> = {
      urgente: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      alta: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      media: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      baixa: 'bg-zinc-800 text-zinc-400 border-zinc-700'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${map[p] || ''}`}>
        {p}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Quadro de Tarefas</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Gerencie demandas da equipe: manutenção de cabos, produção de vinhetas, ensaios e testes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Kanban / Lista */}
          <div className="p-1 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'kanban' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'lista' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Lista
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colTarefas = tarefas.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-300">
                    {col.title}
                  </h3>
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center">
                    {colTarefas.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTarefas.map((tarefa) => {
                    const isMyTask = tarefa.responsavelId === user?.id;
                    const canEdit = isAdmin || isMyTask;

                    return (
                      <div
                        key={tarefa.id}
                        onClick={() => setDetailTarefa(tarefa)}
                        className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-2.5 shadow-sm group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            {tarefa.categoria}
                          </span>
                          {getPriorityBadge(tarefa.prioridade)}
                        </div>

                        <h4 className="font-semibold text-xs text-white leading-snug group-hover:text-indigo-300 transition-colors">
                          {tarefa.titulo}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-900">
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-zinc-500" />
                            <span className="truncate max-w-[100px]">
                              {tarefa.responsavelNome || 'Toda a Equipe'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {tarefa.comentarios?.length > 0 && (
                              <span className="flex items-center gap-0.5 text-zinc-500">
                                <MessageSquare className="w-3 h-3" />
                                {tarefa.comentarios.length}
                              </span>
                            )}
                            <span className="text-zinc-500 flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              {tarefa.prazo.split('-').slice(1).join('/')}
                            </span>
                          </div>
                        </div>

                        {/* Quick Move Buttons */}
                        {canEdit && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-1 flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
                          >
                            {col.id !== 'a_fazer' && (
                              <button
                                onClick={() => handleMoveStatus(tarefa.id, 'a_fazer')}
                                title="Mover para A Fazer"
                                className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                              >
                                ← Fazer
                              </button>
                            )}
                            {col.id !== 'em_andamento' && (
                              <button
                                onClick={() => handleMoveStatus(tarefa.id, 'em_andamento')}
                                title="Mover para Em Andamento"
                                className="px-1.5 py-0.5 rounded text-[10px] bg-blue-900/40 hover:bg-blue-800 text-blue-300"
                              >
                                Andamento
                              </button>
                            )}
                            {col.id !== 'concluida' && (
                              <button
                                onClick={() => handleMoveStatus(tarefa.id, 'concluida')}
                                title="Concluir Tarefa"
                                className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300"
                              >
                                Concluir ✓
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
          {tarefas.map((t) => (
            <div
              key={t.id}
              onClick={() => setDetailTarefa(t)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">{t.titulo}</h4>
                  {getPriorityBadge(t.prioridade)}
                </div>
                <p className="text-xs text-zinc-400">
                  Responsável: <strong className="text-zinc-200">{t.responsavelNome || 'Toda a Equipe'}</strong> • Prazo: {t.prazo} • Categoria: {t.categoria}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 capitalize">
                  {t.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL: Task Details & Comments */}
      {detailTarefa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  {detailTarefa.categoria}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{detailTarefa.titulo}</h3>
              </div>
              <button onClick={() => setDetailTarefa(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-zinc-400">Responsável: <strong className="text-white">{detailTarefa.responsavelNome || 'Equipe Geral'}</strong></span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">Prazo: <strong className="text-white">{detailTarefa.prazo}</strong></span>
                <span className="text-zinc-600">•</span>
                {getPriorityBadge(detailTarefa.prioridade)}
              </div>

              {detailTarefa.descricao && (
                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                  {detailTarefa.descricao}
                </div>
              )}

              {/* Status Switcher in modal */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-zinc-400 font-semibold">Alterar Status:</span>
                {(['a_fazer', 'em_andamento', 'aguardando', 'concluida'] as TarefaStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleMoveStatus(detailTarefa.id, st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      detailTarefa.status === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Comments Section */}
              <div className="pt-3 border-t border-zinc-800">
                <h4 className="font-bold text-xs uppercase text-zinc-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comentários & Andamento ({detailTarefa.comentarios?.length || 0})</span>
                </h4>

                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                  {detailTarefa.comentarios?.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">Nenhum comentário ainda.</p>
                  ) : (
                    detailTarefa.comentarios?.map((c) => (
                      <div key={c.id} className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span className="font-bold text-zinc-200">{c.usuarioNome}</span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(c.data).toLocaleDateString('pt-BR')} às {new Date(c.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-zinc-300">{c.texto}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComentario}
                    onChange={(e) => setNewComentario(e.target.value)}
                    placeholder="Adicionar atualização ou comentário..."
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nova Tarefa */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Cadastrar Nova Tarefa</h3>
            <p className="text-xs text-zinc-400 mb-4">Atribua a um voluntário ou para toda a equipe.</p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Título da Tarefa *</label>
                <input
                  required
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Calibrar balanço de branco das câmeras"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Responsável</label>
                  <select
                    value={formResponsavelId}
                    onChange={(e) => setFormResponsavelId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="">Equipe Toda</option>
                    {voluntarios.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Prazo de Entrega *</label>
                  <input
                    required
                    type="date"
                    value={formPrazo}
                    onChange={(e) => setFormPrazo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Prioridade</label>
                  <select
                    value={formPrioridade}
                    onChange={(e) => setFormPrioridade(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    placeholder="Ex: Vídeo, Áudio, Luz"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Detalhes sobre a execução da tarefa..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Salvando...' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
