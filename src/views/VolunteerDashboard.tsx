import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../services/api';
import { Culto, EscalaItem, Tarefa, Comunicado, User, SolicitacaoTroca, MusicaSetlist } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Music2,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  History,
  Edit2,
  Trash2,
  Plus,
  X,
  FileText,
  Play,
  ListOrdered
} from 'lucide-react';

export const VolunteerDashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [minhasEscalas, setMinhasEscalas] = useState<EscalaItem[]>([]);
  const [todosCultos, setTodosCultos] = useState<Culto[]>([]);
  const [trocas, setTrocas] = useState<SolicitacaoTroca[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [voluntarios, setVoluntarios] = useState<User[]>([]);

  // Tab state for each service card side panel: 'setlist' or 'programacao'
  const [sideTabMap, setSideTabMap] = useState<Record<string, 'setlist' | 'programacao'>>({});

  // Action states for Indisponibilidade
  const [indisponivelModal, setIndisponivelModal] = useState(false);
  const [editingIndisponivelEscala, setEditingIndisponivelEscala] = useState<EscalaItem | null>(null);
  const [motivoIndisponibilidade, setMotivoIndisponibilidade] = useState('');

  // Action states for Troca
  const [trocaModal, setTrocaModal] = useState(false);
  const [activeEscalaForTroca, setActiveEscalaForTroca] = useState<EscalaItem | null>(null);
  const [editingTrocaId, setEditingTrocaId] = useState<string | null>(null);
  const [motivoTroca, setMotivoTroca] = useState('');
  const [substitutoSugeridoId, setSubstitutoSugeridoId] = useState('');

  // Add song to setlist modal (for louvor volunteers)
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [targetCultoForSong, setTargetCultoForSong] = useState<Culto | null>(null);
  const [songTitulo, setSongTitulo] = useState('');
  const [songArtista, setSongArtista] = useState('');
  const [songTom, setSongTom] = useState('G');
  const [songLinkCifra, setSongLinkCifra] = useState('');
  const [songLinkRef, setSongLinkRef] = useState('');
  const [songObs, setSongObs] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Check if volunteer belongs to Louvor
  const isLouvorMember = Boolean(
    user?.perfil === 'admin' ||
    user?.perfil === 'ministro_louvor' ||
    (user as any)?.funcoesIds?.some((f: string) => f.toLowerCase().includes('louvor') || f.toLowerCase().includes('musico') || f.toLowerCase().includes('ministro') || f.toLowerCase().includes('vocal')) ||
    user?.funcoes?.some((f) => f.toLowerCase().includes('louvor') || f.toLowerCase().includes('vocal') || f.toLowerCase().includes('musico') || f.toLowerCase().includes('musica') || f.toLowerCase().includes('ministro')) ||
    (user as any)?.departamentoId === 'dep-louvor' ||
    (user as any)?.departamentoIds?.includes('dep-louvor') ||
    user?.departamentos?.some((d) => d.toLowerCase().includes('louvor') || d.toLowerCase().includes('musica'))
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [cultosData, escalasData, trocasData, tarefasData, avisosData, usersData] = await Promise.all([
        api.getCultos(),
        api.getEscalas({ usuarioId: user.id }),
        api.getTrocas(),
        api.getTarefas(),
        api.getComunicados(),
        api.getUsers()
      ]);

      setTodosCultos(cultosData);
      setMinhasEscalas(escalasData);
      setTrocas(trocasData);
      setTarefas(tarefasData.filter((t) => t.responsavelId === user.id && t.status !== 'concluida'));
      setComunicados(avisosData.slice(0, 3));
      setVoluntarios(usersData.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Presence Confirmation
  const handleConfirmarPresenca = async (escalaId: string) => {
    setSubmitting(true);
    try {
      await api.confirmarEscala(escalaId, 'confirmado');
      showToast({
        type: 'success',
        title: 'Presença Confirmada!',
        message: 'Obrigado por confirmar sua participação no culto.'
      });
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao confirmar presença' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Indisponibilidade Modal (Create or Edit Reason)
  const handleOpenIndisponibilidade = (escala: EscalaItem) => {
    setEditingIndisponivelEscala(escala);
    setMotivoIndisponibilidade(escala.motivoIndisponibilidade || '');
    setIndisponivelModal(true);
  };

  const handleSalvarIndisponibilidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndisponivelEscala) return;
    setSubmitting(true);
    try {
      if (editingIndisponivelEscala.statusConfirmacao === 'indisponivel') {
        // Edit existing reason
        await api.editarMotivoEscala(editingIndisponivelEscala.id, {
          motivo: motivoIndisponibilidade,
          status: 'indisponivel'
        });
        showToast({
          type: 'success',
          title: 'Motivo Atualizado',
          message: 'A justificativa de ausência foi atualizada.'
        });
      } else {
        // Mark as indisponivel
        await api.confirmarEscala(editingIndisponivelEscala.id, 'indisponivel', motivoIndisponibilidade);
        showToast({
          type: 'warning',
          title: 'Indisponibilidade Registrada',
          message: 'A coordenação foi informada da sua justificativa.'
        });
      }
      setIndisponivelModal(false);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao registrar indisponibilidade' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Trade Request Modal (Create or Edit)
  const handleOpenTradeModal = (escala: EscalaItem, existingTroca?: SolicitacaoTroca) => {
    setActiveEscalaForTroca(escala);
    if (existingTroca) {
      setEditingTrocaId(existingTroca.id);
      setMotivoTroca(existingTroca.motivo);
      setSubstitutoSugeridoId(existingTroca.substitutoSugeridoId || '');
    } else {
      setEditingTrocaId(null);
      setMotivoTroca('');
      setSubstitutoSugeridoId('');
    }
    setTrocaModal(true);
  };

  const handleSalvarTroca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEscalaForTroca) return;
    setSubmitting(true);
    try {
      if (editingTrocaId) {
        // Edit existing pending trade request
        await api.editarTroca(editingTrocaId, {
          motivo: motivoTroca,
          substitutoSugeridoId: substitutoSugeridoId || undefined
        });
        showToast({
          type: 'success',
          title: 'Pedido de Troca Atualizado',
          message: 'A justificativa da troca foi atualizada.'
        });
      } else {
        // Create new trade request
        await api.solicitarTroca({
          escalaItemId: activeEscalaForTroca.id,
          motivo: motivoTroca,
          substitutoSugeridoId: substitutoSugeridoId || undefined
        });
        showToast({
          type: 'info',
          title: 'Solicitação de Troca Enviada',
          message: 'O coordenador e o voluntário sugerido foram informados.'
        });
      }
      setTrocaModal(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao processar troca', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel/Delete Trade Request
  const handleCancelarTroca = async (trocaId: string) => {
    setSubmitting(true);
    try {
      const res = await api.cancelarTroca(trocaId);
      showToast({
        type: 'success',
        title: 'Pedido de Troca Cancelado',
        message: res.message || 'Sua escala foi restabelecida como confirmada.'
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao cancelar troca', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Add song to service setlist (Louvor team)
  const handleOpenAddSong = (culto: Culto) => {
    setTargetCultoForSong(culto);
    setSongTitulo('');
    setSongArtista('');
    setSongTom('G');
    setSongLinkCifra('');
    setSongLinkRef('');
    setSongObs('');
    setSongModalOpen(true);
  };

  const handleSalvarSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCultoForSong || !songTitulo) return;
    setSubmitting(true);
    try {
      await api.addSongToSetlist(targetCultoForSong.id, {
        titulo: songTitulo,
        artista: songArtista,
        tom: songTom,
        linkReferencia: songLinkRef,
        linkCifra: songLinkCifra,
        observacoes: songObs
      });
      showToast({
        type: 'success',
        title: 'Música Adicionada!',
        message: `"${songTitulo}" adicionada ao setlist do culto.`
      });
      setSongModalOpen(false);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao adicionar música' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (tarefa: Tarefa) => {
    const nextStatus = tarefa.status === 'a_fazer' ? 'em_andamento' : 'concluida';
    try {
      await api.updateTarefa(tarefa.id, { status: nextStatus });
      showToast({ type: 'success', title: 'Tarefa atualizada' });
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao atualizar tarefa' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  // Filter future services where the volunteer is scheduled
  const todayStr = new Date().toISOString().split('T')[0];
  const scheduledUpcoming = minhasEscalas
    .map((e) => {
      const c = todosCultos.find((item) => item.id === e.cultoId);
      const linkedTroca = trocas.find((t) => t.escalaItemId === e.id && t.status === 'pendente');
      return { escala: e, culto: c, troca: linkedTroca };
    })
    .filter((item) => item.culto && item.culto.data >= todayStr && item.culto.status !== 'cancelado')
    .sort((a, b) => {
      const dtA = `${a.culto!.data}T${a.culto!.horarioInicio}`;
      const dtB = `${b.culto!.data}T${b.culto!.horarioInicio}`;
      return dtA.localeCompare(dtB);
    });

  // Calculate past attendances
  const escalasPassadas = minhasEscalas.filter((e) => Boolean(e.statusPresenca));
  const totalPresente = escalasPassadas.filter((e) => e.statusPresenca === 'presente').length;
  const taxaPresenca = escalasPassadas.length > 0 ? Math.round((totalPresente / escalasPassadas.length) * 100) : 100;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Olá, {user?.nome?.split(' ')[0]} 👋
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Acompanhe suas escalas, confirme presença, gerencie justificativas e consulte setlists.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isLouvorMember && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-semibold">
              <Music2 className="w-3.5 h-3.5" /> Equipe de Louvor
            </span>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400">Frequência:</span>
            <span className="font-bold text-white">{taxaPresenca}%</span>
          </div>
        </div>
      </div>

      {/* SECTION: ALL SCHEDULED SERVICES FOR THIS VOLUNTEER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-base text-white tracking-tight">
              Cultos em que Você está Escalado ({scheduledUpcoming.length})
            </h3>
          </div>
        </div>

        {scheduledUpcoming.length === 0 ? (
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 text-center">
            <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-300">Você não possui escalas futuras no momento</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              Assim que a liderança cadastrar sua escala, todos os cultos com suas funções e setlists aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledUpcoming.map(({ escala, culto, troca }, index) => {
              if (!culto) return null;
              const isFirst = index === 0;

              return (
                <div
                  key={escala.id}
                  className={`rounded-2xl border p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all ${
                    isFirst
                      ? 'border-indigo-500/40 bg-white dark:bg-zinc-900 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {culto.tipo}
                      </span>
                      {isFirst && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                          Próximo
                        </span>
                      )}
                    </div>

                    {/* Confirmation Status Badge */}
                    <div>
                      {escala.statusConfirmacao === 'confirmado' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Presença Confirmada
                        </span>
                      )}
                      {escala.statusConfirmacao === 'pendente' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertCircle className="w-3.5 h-3.5" /> Confirmação Pendente
                        </span>
                      )}
                      {escala.statusConfirmacao === 'indisponivel' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3.5 h-3.5" /> Informou Indisponibilidade
                        </span>
                      )}
                      {escala.statusConfirmacao === 'troca_solicitada' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Pedido de Troca em Análise
                        </span>
                      )}
                      {escala.statusConfirmacao === 'substituido' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                          Substituição Concluída
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Culto & Role Details */}
                    <div className="lg:col-span-2 space-y-3">
                      <div>
                        <h4 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">{culto.titulo}</h4>
                        {culto.tema && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mt-0.5">"{culto.tema}"</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300 font-medium">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                          <span>
                            {new Date(culto.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-indigo-500" />
                          <span>{culto.horarioInicio} às {culto.horarioTermino}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-indigo-500" />
                          <span>{culto.local}</span>
                        </div>
                      </div>

                      {/* Assigned Role Box */}
                      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">
                            Sua Função Atribuída
                          </span>
                          <p className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">{escala.funcaoNome}</p>
                          {escala.observacao && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Obs: {escala.observacao}</p>
                          )}
                        </div>
                      </div>

                      {/* Indisponibility Notice & Edit Reason */}
                      {escala.statusConfirmacao === 'indisponivel' && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-rose-700 dark:text-rose-300">
                            <span>Motivo informado de ausência:</span>
                            <button
                              onClick={() => handleOpenIndisponibilidade(escala)}
                              className="text-[11px] text-rose-600 dark:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <Edit2 className="w-3 h-3" /> Editar Motivo
                            </button>
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 italic">{escala.motivoIndisponibilidade || 'Sem motivo registrado.'}</p>
                        </div>
                      )}

                      {/* Pending Trade Notice & Edit / Cancel buttons */}
                      {troca && (
                        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <ArrowRightLeft className="w-3.5 h-3.5" /> Pedido de Troca Enviado
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenTradeModal(escala, troca)}
                                className="text-xs text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" /> Editar Pedido
                              </button>
                              <button
                                onClick={() => handleCancelarTroca(troca.id)}
                                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Excluir Pedido
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300">
                            <strong>Motivo:</strong> {troca.motivo}
                          </p>
                          {troca.substitutoSugeridoNome && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              <strong>Substituto sugerido:</strong> {troca.substitutoSugeridoNome}
                            </p>
                          )}
                        </div>
                      )}

                      {/* ACTION BUTTONS */}
                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        {escala.statusConfirmacao !== 'confirmado' && (
                          <button
                            disabled={submitting}
                            onClick={() => handleConfirmarPresenca(escala.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirmar Presença</span>
                          </button>
                        )}

                        {escala.statusConfirmacao !== 'indisponivel' && escala.statusConfirmacao !== 'troca_solicitada' && (
                          <button
                            disabled={submitting}
                            onClick={() => handleOpenIndisponibilidade(escala)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-slate-200 dark:border-transparent text-xs font-medium transition-all cursor-pointer"
                          >
                            <XCircle className="w-4 h-4 text-rose-500" />
                            <span>Informar Indisponibilidade</span>
                          </button>
                        )}

                        {escala.statusConfirmacao !== 'troca_solicitada' && (
                          <button
                            disabled={submitting}
                            onClick={() => handleOpenTradeModal(escala)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-all cursor-pointer"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                            <span>Solicitar Troca</span>
                          </button>
                        )}

                        {isLouvorMember && (
                          <button
                            onClick={() => handleOpenAddSong(culto)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-600/20 dark:hover:bg-pink-600/30 border border-pink-200 dark:border-pink-500/30 text-pink-700 dark:text-pink-300 text-xs font-medium transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar Música</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Side Panel: Toggle between Setlist and Programação */}
                    <div className="bg-slate-50 dark:bg-zinc-950/60 rounded-xl p-4 border border-slate-200 dark:border-zinc-800/80 flex flex-col justify-between">
                      <div>
                        {/* Selector Tabs */}
                        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-200/70 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 mb-3">
                          <button
                            type="button"
                            onClick={() => setSideTabMap((prev) => ({ ...prev, [culto.id]: 'setlist' }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              (sideTabMap[culto.id] || 'setlist') === 'setlist'
                                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <Music2 className="w-3.5 h-3.5" />
                            <span>Setlist ({culto.setlist?.length || 0})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSideTabMap((prev) => ({ ...prev, [culto.id]: 'programacao' }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              sideTabMap[culto.id] === 'programacao'
                                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                            <span>Programação ({culto.programacao?.length || 0})</span>
                          </button>
                        </div>

                        {/* Content: Setlist */}
                        {(sideTabMap[culto.id] || 'setlist') === 'setlist' ? (
                          <div className="space-y-2">
                            {(!culto.setlist || culto.setlist.length === 0) ? (
                              <p className="text-xs text-zinc-500 py-4 text-center italic">
                                Repertório ainda não cadastrado.
                              </p>
                            ) : (
                              culto.setlist.slice(0, 4).map((m, idx) => (
                                <div key={m.id} className="text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/50 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate">{idx + 1}. {m.titulo}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold">
                                      {m.tom}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{m.artista}</p>
                                </div>
                              ))
                            )}
                          </div>
                        ) : (
                          /* Content: Programação / Ordem do Culto */
                          <div className="space-y-2">
                            {(!culto.programacao || culto.programacao.length === 0) ? (
                              <p className="text-xs text-zinc-500 py-4 text-center italic">
                                Ordem do culto ainda não detalhada.
                              </p>
                            ) : (
                              culto.programacao.slice(0, 5).map((b) => (
                                <div key={b.id} className="text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/50 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                                        {b.ordem}
                                      </span>
                                      <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate">{b.titulo}</span>
                                    </div>
                                    {b.duracaoMinutos && (
                                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                                        {b.duracaoMinutos} min
                                      </span>
                                    )}
                                  </div>
                                  {b.responsavel && (
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 pl-7">
                                      Responsável: {b.responsavel}
                                    </p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 mt-3 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between">
                        <button
                          onClick={() => onNavigate('setlists')}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <span>Ver repertório completo</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Tasks & Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Minhas Tarefas */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Tarefas Atribuídas a Mim</h3>
            </div>
            <button
              onClick={() => onNavigate('tarefas')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Ver quadro
            </button>
          </div>

          <div className="space-y-2.5">
            {tarefas.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhuma tarefa pendente para você! 🎉</p>
            ) : (
              tarefas.map((tar) => (
                <div
                  key={tar.id}
                  className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-zinc-200 truncate">{tar.titulo}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Prazo: {tar.prazo}</p>
                  </div>
                  <button
                    onClick={() => handleToggleTaskStatus(tar)}
                    className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-medium"
                  >
                    {tar.status === 'a_fazer' ? 'Iniciar' : 'Concluir'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Comunicados da Equipe */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>📢 Comunicados Recentes</span>
            </h3>
            <button
              onClick={() => onNavigate('comunicados')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-2.5">
            {comunicados.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhum comunicado recente.</p>
            ) : (
              comunicados.map((com) => (
                <div
                  key={com.id}
                  className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-200">{com.titulo}</h4>
                    {com.urgente && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                        Urgente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{com.conteudo}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Participações passadas */}
      {escalasPassadas.length > 0 && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            <span>Histórico de Participações</span>
          </h3>
          <div className="divide-y divide-zinc-800">
            {escalasPassadas.slice(0, 5).map((e) => {
              const c = todosCultos.find((item) => item.id === e.cultoId);
              return (
                <div key={e.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-zinc-200">{c?.titulo}</span>
                    <span className="text-zinc-500 block text-[11px]">{c?.data} • {e.funcaoNome}</span>
                  </div>
                  <span
                    className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] ${
                      e.statusPresenca === 'presente'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {e.statusPresenca?.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Informar ou Editar Indisponibilidade */}
      {indisponivelModal && editingIndisponivelEscala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              {editingIndisponivelEscala.statusConfirmacao === 'indisponivel' ? 'Editar Motivo de Indisponibilidade' : 'Informar Indisponibilidade'}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Função: {editingIndisponivelEscala.funcaoNome}
            </p>

            <form onSubmit={handleSalvarIndisponibilidade} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Motivo / Justificativa *
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoIndisponibilidade}
                  onChange={(e) => setMotivoIndisponibilidade(e.target.value)}
                  placeholder="Ex: Trabalho extraordinário, compromisso familiar, saúde..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIndisponivelModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Salvando...' : 'Gravar Justificativa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Solicitar ou Editar Troca */}
      {trocaModal && activeEscalaForTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              {editingTrocaId ? 'Editar Solicitação de Troca' : 'Solicitar Troca de Escala'}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Função: {activeEscalaForTroca.funcaoNome}
            </p>

            <form onSubmit={handleSalvarTroca} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Motivo da Troca *
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoTroca}
                  onChange={(e) => setMotivoTroca(e.target.value)}
                  placeholder="Explique o motivo para a coordenação..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Sugerir Voluntário Substituto (Opcional)
                </label>
                <select
                  value={substitutoSugeridoId}
                  onChange={(e) => setSubstitutoSugeridoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Nenhum específico (Coordenação definirá)</option>
                  {voluntarios.map((vol) => (
                    <option key={vol.id} value={vol.id}>
                      {vol.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTrocaModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Salvando...' : editingTrocaId ? 'Atualizar Pedido' : 'Enviar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar Música ao Setlist (Equipe de Louvor) */}
      {songModalOpen && targetCultoForSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Adicionar Música ao Repertório</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Culto: {targetCultoForSong.titulo} ({targetCultoForSong.data})
            </p>

            <form onSubmit={handleSalvarSong} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome da Canção *</label>
                <input
                  required
                  type="text"
                  value={songTitulo}
                  onChange={(e) => setSongTitulo(e.target.value)}
                  placeholder="Ex: Bondade de Deus"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Artista / Intérprete</label>
                  <input
                    type="text"
                    value={songArtista}
                    onChange={(e) => setSongArtista(e.target.value)}
                    placeholder="Ex: Bethel / Isaias Saad"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Tom Musical *</label>
                  <input
                    required
                    type="text"
                    value={songTom}
                    onChange={(e) => setSongTom(e.target.value)}
                    placeholder="Ex: G, Em, Bb"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Link de Cifra / Letra</label>
                <input
                  type="url"
                  value={songLinkCifra}
                  onChange={(e) => setSongLinkCifra(e.target.value)}
                  placeholder="https://cifraclub.com.br/..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Link de Áudio / Vídeo (YouTube)</label>
                <input
                  type="url"
                  value={songLinkRef}
                  onChange={(e) => setSongLinkRef(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Observações de Execução</label>
                <input
                  type="text"
                  value={songObs}
                  onChange={(e) => setSongObs(e.target.value)}
                  placeholder="Ex: Solo de guitarra antes do 2º refrão..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSongModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Salvando...' : 'Adicionar ao Culto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
