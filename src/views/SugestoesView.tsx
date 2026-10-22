import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Sugestao, SugestaoCategoria, SugestaoStatus } from '../types';
import {
  MessageSquare,
  Plus,
  Clock,
  User as UserIcon,
  X
} from 'lucide-react';

export const SugestoesView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string>('todas');

  // New Suggestion Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitulo, setNewTitulo] = useState('');
  const [newDescricao, setNewDescricao] = useState('');
  const [newCategoria, setNewCategoria] = useState<SugestaoCategoria>('melhoria_equipamento');
  const [newPrioridade, setNewPrioridade] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media');

  // Admin Reply Modal
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [activeSugestao, setActiveSugestao] = useState<Sugestao | null>(null);
  const [newStatus, setNewStatus] = useState<SugestaoStatus>('em_analise');
  const [respostaAdmin, setRespostaAdmin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const list = await api.getSugestoes();
      setSugestoes(list);
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar sugestões' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createSugestao({
        titulo: newTitulo,
        descricao: newDescricao,
        categoria: newCategoria,
        prioridade: newPrioridade
      });
      showToast({ type: 'success', title: 'Sugestão enviada com sucesso!', message: 'A coordenação foi notificada.' });
      setCreateModalOpen(false);
      setNewTitulo('');
      setNewDescricao('');
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao enviar sugestão' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReply = (sug: Sugestao) => {
    setActiveSugestao(sug);
    setNewStatus(sug.status);
    setRespostaAdmin(sug.respostaAdmin || '');
    setReplyModalOpen(true);
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSugestao) return;
    setSubmitting(true);
    try {
      await api.updateSugestaoStatus(activeSugestao.id, {
        status: newStatus,
        respostaAdmin
      });
      showToast({ type: 'success', title: 'Sugestão atualizada!' });
      setReplyModalOpen(false);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao atualizar' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCategoria = (cat: string) => {
    const map: Record<string, string> = {
      sugestao_compra: 'Sugestão de Compra',
      melhoria_equipamento: 'Melhoria de Equipamento',
      problema_tecnico: 'Problema Técnico',
      melhoria_processo: 'Melhoria de Processo',
      ideia_video_conteudo: 'Ideia de Vídeo / Conteúdo',
      sugestao_transmissao: 'Transmissão ao Vivo',
      espaco_fisico: 'Espaço Físico / Sala',
      treinamento: 'Treinamento & Oficina',
      outras: 'Outras Sugestões'
    };
    return map[cat] || cat;
  };

  const getStatusBadge = (status: SugestaoStatus) => {
    const colors: Record<string, string> = {
      recebida: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      em_analise: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      aprovada: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      em_andamento: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
      concluida: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      rejeitada: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      adiada: 'bg-zinc-800 text-zinc-400 border-zinc-700'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${colors[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredSugestoes = sugestoes.filter((s) => {
    if (filterCat === 'todas') return true;
    return s.categoria === filterCat;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Central de Sugestões & Ideias</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Aponte necessidades, melhorias de transmissão, compras e treinamentos para a equipe.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Sugestão</span>
        </button>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'todas', label: 'Todas' },
          { id: 'melhoria_equipamento', label: 'Equipamentos' },
          { id: 'sugestao_compra', label: 'Compras' },
          { id: 'problema_tecnico', label: 'Problemas Técnicos' },
          { id: 'ideia_video_conteudo', label: 'Vídeo & Conteúdo' },
          { id: 'treinamento', label: 'Treinamento' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCat(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterCat === tab.id
                ? 'bg-zinc-100 text-zinc-900 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sugestoes Grid / Cards */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
        </div>
      ) : filteredSugestoes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-300">Nenhuma sugestão nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSugestoes.map((sug) => (
            <div
              key={sug.id}
              className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    {formatCategoria(sug.categoria)}
                  </span>
                  {getStatusBadge(sug.status)}
                </div>

                <div>
                  <h3 className="font-bold text-base text-white">{sug.titulo}</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{sug.descricao}</p>
                </div>

                {/* Admin reply if any */}
                {sug.respostaAdmin && (
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs">
                    <span className="font-bold text-indigo-300 block mb-0.5">Resposta da Coordenação:</span>
                    <p className="text-zinc-300 leading-snug">{sug.respostaAdmin}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Por {sug.autorNome}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {new Date(sug.dataEnvio).toLocaleDateString('pt-BR')}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={() => handleOpenReply(sug)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-[11px] transition-colors"
                    >
                      Responder / Status
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Nova Sugestão */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Nova Sugestão ou Solicitação</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Envie sua ideia de melhoria ou aponte uma necessidade para a equipe de mídia.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Título *</label>
                <input
                  required
                  type="text"
                  value={newTitulo}
                  onChange={(e) => setNewTitulo(e.target.value)}
                  placeholder="Ex: Intercom sem fio para cinegrafistas"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Categoria *</label>
                <select
                  value={newCategoria}
                  onChange={(e) => setNewCategoria(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  <option value="melhoria_equipamento">Melhoria de Equipamento</option>
                  <option value="sugestao_compra">Sugestão de Compra</option>
                  <option value="problema_tecnico">Problema Técnico</option>
                  <option value="sugestao_transmissao">Transmissão ao Vivo</option>
                  <option value="ideia_video_conteudo">Ideia de Vídeo / Conteúdo</option>
                  <option value="espaco_fisico">Espaço Físico / Cabine</option>
                  <option value="treinamento">Treinamento / Oficina</option>
                  <option value="melhoria_processo">Melhoria de Processo</option>
                  <option value="outras">Outras Sugestões</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Prioridade Sugerida</label>
                <select
                  value={newPrioridade}
                  onChange={(e) => setNewPrioridade(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Descrição Detalhada *</label>
                <textarea
                  required
                  rows={4}
                  value={newDescricao}
                  onChange={(e) => setNewDescricao(e.target.value)}
                  placeholder="Descreva a melhoria, por que é necessária e como ajudará a equipe..."
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
                  {submitting ? 'Enviando...' : 'Enviar Sugestão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Resposta do Administrador */}
      {replyModalOpen && activeSugestao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-base">Atualizar Sugestão</h3>
              <button
                onClick={() => setReplyModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 font-semibold mb-1">{activeSugestao.titulo}</p>
            <p className="text-xs text-zinc-500 mb-4">Autor: {activeSugestao.autorNome}</p>

            <form onSubmit={handleSaveReply} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Status da Sugestão *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  <option value="recebida">Recebida</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="aprovada">Aprovada</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="rejeitada">Rejeitada</option>
                  <option value="adiada">Adiada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Resposta / Parecer</label>
                <textarea
                  rows={3}
                  value={respostaAdmin}
                  onChange={(e) => setRespostaAdmin(e.target.value)}
                  placeholder="Escreva a resposta que o voluntário visualizará..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Salvando...' : 'Salvar Resposta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
