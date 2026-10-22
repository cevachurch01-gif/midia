import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Equipamento, EquipamentoStatus } from '../types';
import {
  HardDrive,
  Plus,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Tag,
  MapPin,
  Clock,
  X
} from 'lucide-react';

export const EquipamentosView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // New Equipment Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formCategoria, setFormCategoria] = useState('Câmeras');
  const [formMarca, setFormMarca] = useState('');
  const [formPatrimonio, setFormPatrimonio] = useState('');
  const [formDataAquisicao, setFormDataAquisicao] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formEstado, setFormEstado] = useState<'novo' | 'bom' | 'regular' | 'precario'>('bom');
  const [formLocal, setFormLocal] = useState('Sala de Mídia');
  const [formStatus, setFormStatus] = useState<EquipamentoStatus>('disponivel');
  const [formObs, setFormObs] = useState('');

  // Maintenance Log Modal
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [activeEquip, setActiveEquip] = useState<Equipamento | null>(null);
  const [maintProblema, setMaintProblema] = useState('');
  const [maintServico, setMaintServico] = useState('');
  const [maintCusto, setMaintCusto] = useState('');
  const [maintTecnico, setMaintTecnico] = useState('');
  const [maintStatus, setMaintStatus] = useState<'em_aberto' | 'concluido'>('em_aberto');
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailEquip, setDetailEquip] = useState<Equipamento | null>(null);

  const loadData = useCallback(async () => {
    try {
      const list = await api.getEquipamentos();
      setEquipamentos(list);
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar equipamentos' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateEquip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createEquipamento({
        nome: formNome,
        categoria: formCategoria,
        marcaModelo: formMarca,
        patrimonioNumero: formPatrimonio,
        dataAquisicao: formDataAquisicao,
        valorAquisicao: formValor ? parseFloat(formValor.replace(',', '.')) : undefined,
        estadoConservacao: formEstado,
        localArmazenamento: formLocal,
        status: formStatus,
        observacoes: formObs
      });
      showToast({ type: 'success', title: 'Equipamento cadastrado com sucesso!' });
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao cadastrar', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMaintenance = (equip: Equipamento) => {
    setActiveEquip(equip);
    setMaintProblema('');
    setMaintServico('');
    setMaintCusto('');
    setMaintTecnico(user?.nome || '');
    setMaintStatus('em_aberto');
    setMaintModalOpen(true);
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEquip) return;
    setSubmitting(true);
    try {
      await api.addManutencao(activeEquip.id, {
        descricaoProblema: maintProblema,
        servicoRealizado: maintServico,
        custo: maintCusto ? parseFloat(maintCusto.replace(',', '.')) : undefined,
        tecnicoResponsavel: maintTecnico,
        status: maintStatus
      });
      showToast({ type: 'success', title: 'Registro de manutenção gravado!' });
      setMaintModalOpen(false);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao registrar manutenção' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: EquipamentoStatus) => {
    const map: Record<string, { label: string; color: string }> = {
      em_uso: { label: 'Em Uso', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
      disponivel: { label: 'Disponível', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
      em_manutencao: { label: 'Em Manutenção', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
      com_defeito: { label: 'Com Defeito', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
      emprestado: { label: 'Emprestado', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
      descartado: { label: 'Descartado', color: 'bg-zinc-800 text-zinc-500 border-zinc-700' }
    };
    const s = map[status] || { label: status, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.color}`}>{s.label}</span>;
  };

  const filteredEquipamentos = equipamentos.filter((e) => {
    if (statusFilter === 'todos') return true;
    return e.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Equipamentos & Patrimônio</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Inventário completo de câmeras, cabos, switchers, iluminação e histórico de reparos.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Equipamento</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['todos', 'disponivel', 'em_uso', 'em_manutencao', 'com_defeito', 'emprestado'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize shrink-0 transition-all ${
              statusFilter === st
                ? 'bg-zinc-100 text-zinc-900 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {st === 'todos' ? 'Todos' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Equipment Cards Grid */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
        </div>
      ) : filteredEquipamentos.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <HardDrive className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-300">Nenhum equipamento cadastrado com este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipamentos.map((eq) => {
            const hasOpenIssue = eq.manutencoes.some((m) => m.status === 'em_aberto');

            return (
              <div
                key={eq.id}
                className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      {eq.categoria}
                    </span>
                    {getStatusBadge(eq.status)}
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white">{eq.nome}</h3>
                    <p className="text-xs text-zinc-400">{eq.marcaModelo}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-400 pt-1">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Patrimônio: <strong className="text-zinc-200">{eq.patrimonioNumero}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{eq.localArmazenamento}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Conservação: <strong className="text-zinc-200 capitalize">{eq.estadoConservacao}</strong></span>
                    </div>
                  </div>

                  {hasOpenIssue && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span className="truncate">Manutenção aberta pendente</span>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDetailEquip(eq)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 py-1"
                  >
                    Histórico & Detalhes
                  </button>

                  <button
                    onClick={() => handleOpenMaintenance(eq)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Relatar Problema</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL: Equipment History */}
      {detailEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase">{detailEquip.categoria}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{detailEquip.nome}</h3>
                <p className="text-xs text-zinc-400">Patrimônio: {detailEquip.patrimonioNumero} • {detailEquip.marcaModelo}</p>
              </div>
              <button onClick={() => setDetailEquip(null)} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500">Local de Guarda:</span>
                  <p className="font-semibold text-zinc-200">{detailEquip.localArmazenamento}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Estado de Conservação:</span>
                  <p className="font-semibold text-zinc-200 capitalize">{detailEquip.estadoConservacao}</p>
                </div>
                {detailEquip.valorAquisicao && (
                  <div>
                    <span className="text-zinc-500">Valor de Aquisição:</span>
                    <p className="font-semibold text-zinc-200">R$ {detailEquip.valorAquisicao.toFixed(2)}</p>
                  </div>
                )}
                {detailEquip.dataAquisicao && (
                  <div>
                    <span className="text-zinc-500">Data de Entrada:</span>
                    <p className="font-semibold text-zinc-200">{detailEquip.dataAquisicao}</p>
                  </div>
                )}
              </div>

              {detailEquip.observacoes && (
                <div className="text-xs text-zinc-400 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                  <span className="font-bold text-zinc-300 block mb-0.5">Observações:</span>
                  {detailEquip.observacoes}
                </div>
              )}

              {/* Maintenance records log */}
              <div>
                <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>Histórico de Manutenções & Reparos ({detailEquip.manutencoes.length})</span>
                </h4>

                {detailEquip.manutencoes.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-3 text-center">Nenhum reparo registrado até o momento.</p>
                ) : (
                  <div className="space-y-2">
                    {detailEquip.manutencoes.map((man) => (
                      <div
                        key={man.id}
                        className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200">{man.descricaoProblema}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              man.status === 'concluido'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {man.status === 'concluido' ? 'Resolvido' : 'Em Aberto'}
                          </span>
                        </div>
                        {man.servicoRealizado && (
                          <p className="text-zinc-400">Serviço: {man.servicoRealizado}</p>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                          <span>Técnico: {man.tecnicoResponsavel || 'Não informado'}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {man.data}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
              <button
                onClick={() => setDetailEquip(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Relatar Problema / Manutenção */}
      {maintModalOpen && activeEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Registrar Ocorrência / Manutenção</h3>
            <p className="text-xs text-zinc-400 mb-4">{activeEquip.nome} ({activeEquip.patrimonioNumero})</p>

            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Descrição do Problema Técnico *</label>
                <textarea
                  required
                  rows={3}
                  value={maintProblema}
                  onChange={(e) => setMaintProblema(e.target.value)}
                  placeholder="Ex: Sinal HDMI oscilando, botão de zoom travando, ruído no áudio..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Serviço Realizado / Solução</label>
                <input
                  type="text"
                  value={maintServico}
                  onChange={(e) => setMaintServico(e.target.value)}
                  placeholder="Ex: Troca de conector, limpeza ou envio para assistência"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Custo Estimado (R$)</label>
                  <input
                    type="text"
                    value={maintCusto}
                    onChange={(e) => setMaintCusto(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Status da Manutenção *</label>
                  <select
                    value={maintStatus}
                    onChange={(e) => setMaintStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="em_aberto">Em Aberto (Com Defeito)</option>
                    <option value="concluido">Concluído (Equipamento Pronto)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Salvando...' : 'Gravar Ocorrência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Novo Equipamento */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Cadastrar Novo Equipamento</h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEquip} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome do Equipamento *</label>
                <input
                  required
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Câmera Sony A7 IV"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Categoria *</label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="Câmeras">Câmeras</option>
                    <option value="Lentes">Lentes</option>
                    <option value="Switchers & Vídeo">Switchers & Vídeo</option>
                    <option value="Estabilização">Estabilização</option>
                    <option value="Cabeamento">Cabeamento</option>
                    <option value="Áudio & Microfones">Áudio & Microfones</option>
                    <option value="Iluminação">Iluminação</option>
                    <option value="Monitores">Monitores</option>
                    <option value="Computadores">Computadores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Marca e Modelo</label>
                  <input
                    type="text"
                    value={formMarca}
                    onChange={(e) => setFormMarca(e.target.value)}
                    placeholder="Ex: Sony ILCE-7M4"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Nº de Patrimônio / Tag *</label>
                  <input
                    required
                    type="text"
                    value={formPatrimonio}
                    onChange={(e) => setFormPatrimonio(e.target.value)}
                    placeholder="Ex: MID-CAM-002"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Local de Armazenamento *</label>
                  <input
                    required
                    type="text"
                    value={formLocal}
                    onChange={(e) => setFormLocal(e.target.value)}
                    placeholder="Ex: Case 01 - Sala de Mídia"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Estado de Conservação</label>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="novo">Novo</option>
                    <option value="bom">Bom</option>
                    <option value="regular">Regular</option>
                    <option value="precario">Precário</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Status Operacional</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="em_uso">Em Uso</option>
                    <option value="em_manutencao">Em Manutenção</option>
                    <option value="com_defeito">Com Defeito</option>
                    <option value="emprestado">Emprestado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Data de Aquisição</label>
                  <input
                    type="date"
                    value={formDataAquisicao}
                    onChange={(e) => setFormDataAquisicao(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Valor de Compra (R$)</label>
                  <input
                    type="text"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    placeholder="Ex: 5000,00"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Observações Adicionais</label>
                <textarea
                  rows={2}
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  placeholder="Cabos inclusos, fonte de alimentação, firmware..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
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
                  {submitting ? 'Salvando...' : 'Salvar Equipamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
