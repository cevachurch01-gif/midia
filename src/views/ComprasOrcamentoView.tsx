import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PedidoCompra, CompraPrioridade, CompraStatus } from '../types';
import {
  ShoppingCart,
  DollarSign,
  Plus,
  ExternalLink,
  Clock,
  TrendingDown,
  X
} from 'lucide-react';

export const ComprasOrcamentoView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';

  const [compras, setCompras] = useState<PedidoCompra[]>([]);
  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('todos');

  // New Request Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategoria, setFormCategoria] = useState('Audiovisual Geral');
  const [formQuantidade, setFormQuantidade] = useState('1');
  const [formValorEstimado, setFormValorEstimado] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formPrioridade, setFormPrioridade] = useState<CompraPrioridade>('importante');

  // Admin Approval / Update Modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<PedidoCompra | null>(null);
  const [actionStatus, setActionStatus] = useState<CompraStatus>('aprovada');
  const [actionValorAprovado, setActionValorAprovado] = useState('');
  const [actionValorGasto, setActionValorGasto] = useState('');
  const [actionFornecedor, setActionFornecedor] = useState('');
  const [actionJustificativa, setActionJustificativa] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Total Budget Modal
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [newTotalBudget, setNewTotalBudget] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [comprasList, orcamentoData] = await Promise.all([
        api.getCompras(),
        isAdmin ? api.getOrcamento() : Promise.resolve(null)
      ]);
      setCompras(comprasList);
      setOrcamento(orcamentoData);
      if (orcamentoData?.orcamentoTotal) {
        setNewTotalBudget(orcamentoData.orcamentoTotal.toString());
      }
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar dados de compras' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome || !formDescricao || !formValorEstimado) return;
    setSubmitting(true);
    try {
      await api.createCompra({
        nomeProduto: formNome,
        descricao: formDescricao,
        categoria: formCategoria,
        quantidade: parseInt(formQuantidade, 10) || 1,
        valorEstimado: parseFloat(formValorEstimado.replace(',', '.')),
        linkReferencia: formLink,
        prioridade: formPrioridade
      });
      showToast({ type: 'success', title: 'Pedido de compra cadastrado!' });
      setCreateModalOpen(false);
      setFormNome('');
      setFormDescricao('');
      setFormValorEstimado('');
      setFormLink('');
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao cadastrar pedido' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAction = (item: PedidoCompra) => {
    setActiveItem(item);
    setActionStatus(item.status);
    setActionValorAprovado(item.valorAprovado ? item.valorAprovado.toString() : item.valorEstimado.toString());
    setActionValorGasto(item.valorGasto ? item.valorGasto.toString() : '');
    setActionFornecedor(item.fornecedor || '');
    setActionJustificativa(item.justificativaDecisao || '');
    setActionModalOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    setSubmitting(true);
    try {
      await api.updateCompraStatus(activeItem.id, {
        status: actionStatus,
        valorAprovado: actionValorAprovado ? parseFloat(actionValorAprovado.replace(',', '.')) : undefined,
        valorGasto: actionValorGasto ? parseFloat(actionValorGasto.replace(',', '.')) : undefined,
        fornecedor: actionFornecedor,
        justificativaDecisao: actionJustificativa
      });
      showToast({ type: 'success', title: 'Status do pedido atualizado!' });
      setActionModalOpen(false);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao atualizar pedido' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateOrcamento({ orcamentoTotal: parseFloat(newTotalBudget.replace(',', '.')) });
      showToast({ type: 'success', title: 'Orçamento atualizado com sucesso!' });
      setBudgetModalOpen(false);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao atualizar orçamento' });
    }
  };

  const filteredCompras = compras.filter((c) => {
    if (filterStatus !== 'todos' && c.status !== filterStatus) return false;
    if (filterPrioridade !== 'todos' && c.prioridade !== filterPrioridade) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Compras & Orçamento</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Organize as necessidades de equipamentos, aprovações de verba e saldos financeiros.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setBudgetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ajustar Teto Orçamentário</span>
            </button>
          )}

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar Compra</span>
          </button>
        </div>
      </div>

      {/* Financial Health Summary Cards (Admin Only) */}
      {isAdmin && orcamento && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Orçamento Total */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-xs text-zinc-400 font-medium block">1. Orçamento Total</span>
            <p className="text-xl sm:text-2xl font-black text-white mt-1">
              R$ {orcamento.orcamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">{orcamento.orcamentoConfig?.periodo}</p>
          </div>

          {/* Despesas Realizadas */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-xs text-rose-400 font-medium block flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> 2. Efetivamente Gasto
            </span>
            <p className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
              R$ {orcamento.despesasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">Compras executadas</p>
          </div>

          {/* Valor Comprometido */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-xs text-amber-400 font-medium block">3. Total Comprometido</span>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              R$ {orcamento.totalComprometido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">Gasto + Aprovado pendente</p>
          </div>

          {/* Saldo Disponível */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-emerald-500/30 bg-emerald-950/10">
            <span className="text-xs text-emerald-400 font-bold block flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> 4. Saldo Disponível
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              R$ {orcamento.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">Disponível para novos itens</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['todos', 'pendente', 'aprovada', 'comprada', 'rejeitada'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize shrink-0 transition-all ${
                filterStatus === st
                  ? 'bg-zinc-100 text-zinc-900 font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Prioridade:</span>
          <select
            value={filterPrioridade}
            onChange={(e) => setFilterPrioridade(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
          >
            <option value="todos">Todas</option>
            <option value="essencial">Essencial</option>
            <option value="importante">Importante</option>
            <option value="desejavel">Desejável</option>
          </select>
        </div>
      </div>

      {/* Purchases List */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-white">Lista de Pedidos & Equipamentos</h3>
          </div>
          <span className="text-xs text-zinc-400">{filteredCompras.length} pedidos</span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
          </div>
        ) : filteredCompras.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Nenhum pedido de compra encontrado.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {filteredCompras.map((compra) => {
              const statusColors: Record<string, string> = {
                pendente: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                aprovada: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
                comprada: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
                rejeitada: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
                cancelada: 'bg-zinc-800 text-zinc-400 border-zinc-700'
              };

              const priorityColors: Record<string, string> = {
                essencial: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                importante: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                desejavel: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              };

              return (
                <div
                  key={compra.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">{compra.nomeProduto}</span>
                      <span className="text-xs text-zinc-500">x{compra.quantidade}</span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${priorityColors[compra.prioridade]}`}>
                        {compra.prioridade}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColors[compra.status]}`}>
                        {compra.status}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">{compra.descricao}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                      <span>Categoria: <strong className="text-zinc-300">{compra.categoria}</strong></span>
                      <span>Solicitante: <strong className="text-zinc-300">{compra.solicitanteNome}</strong></span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(compra.dataPedido).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {compra.justificativaDecisao && (
                      <p className="text-xs text-zinc-400 italic bg-zinc-950/60 p-2 rounded-lg border border-zinc-800">
                        Parecer do Coordenador: "{compra.justificativaDecisao}"
                      </p>
                    )}
                  </div>

                  {/* Financial Values Box */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-0 border-zinc-800">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-zinc-500 block">Valor Estimado</span>
                      <span className="text-sm font-bold text-zinc-300">
                        R$ {compra.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {compra.valorGasto && (
                        <div className="mt-0.5">
                          <span className="text-[10px] text-emerald-400 block font-semibold">Valor Gasto Final:</span>
                          <span className="text-sm font-black text-emerald-400">
                            R$ {compra.valorGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {compra.linkReferencia && (
                        <a
                          href={compra.linkReferencia}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir link do produto"
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => handleOpenAction(compra)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                        >
                          Gerenciar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Solicitar Compra */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-base">Novo Pedido de Compra</h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome do Equipamento / Material *</label>
                <input
                  required
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Cabo HDMI óptico 30m"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Quantidade *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formQuantidade}
                    onChange={(e) => setFormQuantidade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Valor Estimado (R$) *</label>
                  <input
                    required
                    type="text"
                    value={formValorEstimado}
                    onChange={(e) => setFormValorEstimado(e.target.value)}
                    placeholder="Ex: 450,00"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Categoria</label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="Câmeras & Lentes">Câmeras & Lentes</option>
                    <option value="Cabeamento & Conexões">Cabeamento & Conexões</option>
                    <option value="Áudio & Microfones">Áudio & Microfones</option>
                    <option value="Iluminação">Iluminação</option>
                    <option value="Computadores & Streaming">Computadores & Streaming</option>
                    <option value="Monitores & Telas">Monitores & Telas</option>
                    <option value="Audiovisual Geral">Audiovisual Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Prioridade *</label>
                  <select
                    value={formPrioridade}
                    onChange={(e) => setFormPrioridade(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="essencial">Essencial</option>
                    <option value="importante">Importante</option>
                    <option value="desejavel">Desejável</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Link de Referência</label>
                <input
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Descrição e Justificativa *</label>
                <textarea
                  required
                  rows={3}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Por que este material é necessário e como será utilizado nos cultos..."
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
                  {submitting ? 'Gravando...' : 'Enviar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Admin Decision on Purchase */}
      {actionModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Gerenciar Pedido de Compra</h3>
            <p className="text-xs text-zinc-400 mb-4">{activeItem.nomeProduto}</p>

            <form onSubmit={handleSaveAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Status de Decisão *</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                >
                  <option value="pendente">Pendente de Avaliação</option>
                  <option value="aprovada">Aprovada (Comprometer Verba)</option>
                  <option value="comprada">Comprada / Executada</option>
                  <option value="rejeitada">Rejeitada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Valor Aprovado (R$)</label>
                  <input
                    type="text"
                    value={actionValorAprovado}
                    onChange={(e) => setActionValorAprovado(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Valor Final Gasto (R$)</label>
                  <input
                    type="text"
                    value={actionValorGasto}
                    onChange={(e) => setActionValorGasto(e.target.value)}
                    placeholder="Se já comprado..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Fornecedor / Loja</label>
                <input
                  type="text"
                  value={actionFornecedor}
                  onChange={(e) => setActionFornecedor(e.target.value)}
                  placeholder="Ex: Amazon, Mercado Livre, Loja do Som"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Justificativa / Parecer</label>
                <textarea
                  rows={2}
                  value={actionJustificativa}
                  onChange={(e) => setActionJustificativa(e.target.value)}
                  placeholder="Observação para o solicitante..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Salvar Decisão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ajustar Teto Orçamentário */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Configurar Teto Orçamentário</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Defina o valor total disponível para investimentos da equipe de mídia.
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Valor Total (R$) *</label>
                <input
                  required
                  type="text"
                  value={newTotalBudget}
                  onChange={(e) => setNewTotalBudget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Atualizar Orçamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
