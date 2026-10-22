import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Culto, EscalaItem, User, AuditLog } from '../types';
import {
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  ShoppingCart,
  Wrench,
  DollarSign,
  Plus,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [indicadores, setIndicadores] = useState<any>(null);
  const [orcamento, setOrcamento] = useState<any>(null);
  const [cultos, setCultos] = useState<Culto[]>([]);
  const [escalas, setEscalas] = useState<EscalaItem[]>([]);
  const [voluntarios, setVoluntarios] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [indData, orcData, cultosData, escalasData, usersData, logsData] = await Promise.all([
        api.getIndicadores(),
        api.getOrcamento(),
        api.getCultos(),
        api.getEscalas(),
        api.getUsers(),
        api.getAuditLogs()
      ]);

      setIndicadores(indData);
      setOrcamento(orcData);
      setCultos(cultosData);
      setEscalas(escalasData);
      setVoluntarios(usersData);
      setAuditLogs(logsData.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  // Filter future services
  const todayStr = new Date().toISOString().split('T')[0];
  const proximosCultos = cultos
    .filter((c) => c.status !== 'realizado' && c.status !== 'cancelado' && c.data >= todayStr)
    .sort((a, b) => `${a.data}T${a.horarioInicio}`.localeCompare(`${b.data}T${b.horarioInicio}`))
    .slice(0, 3);

  const pendencias = indicadores?.pendencias || { trocasPendentes: 0, comprasPendentes: 0, sugestoesPendentes: 0, tarefasAtrasadas: 0 };
  const hasUrgent = pendencias.trocasPendentes > 0 || pendencias.comprasPendentes > 0 || indicadores?.confirmacoes?.indisponiveis > 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Painel da Coordenação</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Visão geral da operação de mídia, escalas, cultos e finanças.
          </p>
        </div>

        {/* Quick action shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('cultos')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Culto</span>
          </button>
          <button
            onClick={() => onNavigate('escalas')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-all"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Montar Escala</span>
          </button>
        </div>
      </div>

      {/* Urgent Operational Alerts Bar */}
      {hasUrgent && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 shadow-lg">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Pendências Operacionais Prioritárias</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {pendencias.trocasPendentes > 0 && (
              <button
                onClick={() => onNavigate('trocas')}
                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-amber-500/40 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-amber-300">{pendencias.trocasPendentes}</span>
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">Trocas aguardando análise</p>
              </button>
            )}

            {indicadores?.confirmacoes?.indisponiveis > 0 && (
              <button
                onClick={() => onNavigate('escalas')}
                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-rose-500/40 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-rose-400">{indicadores.confirmacoes.indisponiveis}</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">Indisponibilidades na escala</p>
              </button>
            )}

            {pendencias.comprasPendentes > 0 && (
              <button
                onClick={() => onNavigate('compras')}
                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-sky-500/40 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-sky-400">{pendencias.comprasPendentes}</span>
                  <ShoppingCart className="w-4 h-4 text-sky-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">Pedidos de compra pendentes</p>
              </button>
            )}

            {indicadores?.equipamentosComProblema > 0 && (
              <button
                onClick={() => onNavigate('equipamentos')}
                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-amber-500/40 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-amber-400">{indicadores.equipamentosComProblema}</span>
                  <Wrench className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">Equipamentos c/ defeito</p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Voluntários Ativos */}
        <div
          onClick={() => onNavigate('configuracoes')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Voluntários Ativos</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{voluntarios.filter(v => v.status === 'ativo').length}</p>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Equipe cadastrada</span>
          </p>
        </div>

        {/* Confirmações Próximos Cultos */}
        <div
          onClick={() => onNavigate('escalas')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Confirmações</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {indicadores?.confirmacoes?.confirmados || 0}
            <span className="text-sm font-normal text-zinc-500"> / {indicadores?.confirmacoes?.total || 0}</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {indicadores?.confirmacoes?.pendentes || 0} aguardando resposta
          </p>
        </div>

        {/* Saldo Orçamento */}
        <div
          onClick={() => onNavigate('compras')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Saldo Disponível</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            R$ {(orcamento?.saldoDisponivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            R$ {(orcamento?.totalComprometido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} comprometidos
          </p>
        </div>

        {/* Equipamentos Saudáveis */}
        <div
          onClick={() => onNavigate('equipamentos')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Inventário</span>
            <Wrench className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{indicadores?.totalEquip || 0}</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            {indicadores?.equipamentosComProblema || 0} em manutenção / defeito
          </p>
        </div>
      </div>

      {/* Section: Próximos Cultos Operacionais */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Próximos Cultos & Status da Equipe</h3>
          </div>
          <button
            onClick={() => onNavigate('cultos')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Gerenciar cultos
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {proximosCultos.map((culto) => {
            const cultoEscalas = escalas.filter((e) => e.cultoId === culto.id);
            const confirmados = cultoEscalas.filter((e) => e.statusConfirmacao === 'confirmado').length;
            const pendentes = cultoEscalas.filter((e) => e.statusConfirmacao === 'pendente').length;
            const indisponiveis = cultoEscalas.filter((e) => e.statusConfirmacao === 'indisponivel').length;

            return (
              <div
                key={culto.id}
                className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">{culto.tipo}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 font-medium">
                      {culto.horarioInicio}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{culto.titulo}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>
                      {new Date(culto.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                  </p>
                </div>

                {/* Team Roster Progress */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Escalados:</span>
                    <span className="font-bold text-zinc-200">{cultoEscalas.length} voluntários</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-400 font-semibold">{confirmados} confirmados</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-amber-400 font-semibold">{pendentes} pendentes</span>
                    {indisponiveis > 0 && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="text-rose-400 font-semibold">{indisponiveis} faltas</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('escalas')}
                  className="w-full py-2 text-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <span>Ver escala completa</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Top Volunteers Ranking & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequência dos Voluntários */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Engajamento da Equipe</span>
            </h3>
            <button
              onClick={() => onNavigate('relatorios')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Ver relatório completo
            </button>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {(indicadores?.rankingVoluntarios || []).slice(0, 5).map((vol: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold text-zinc-500 text-xs">#{idx + 1}</span>
                  <div>
                    <span className="font-semibold text-zinc-200">{vol.nome}</span>
                    <span className="text-[11px] text-zinc-500 block">
                      {vol.presencas} presenças registradas
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">{vol.count} escalas</span>
                  {vol.ausencias > 0 && (
                    <span className="text-[10px] text-rose-400 block">{vol.ausencias} ausências</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Feed */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Histórico de Alterações Recentes</span>
            </h3>
            <span className="text-[10px] text-zinc-500">Auditoria</span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhum registro ainda.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{log.acao}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">{log.detalhes}</p>
                  <span className="text-[10px] text-zinc-500 block">Por {log.usuarioNome}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
