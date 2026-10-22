import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ShieldCheck
} from 'lucide-react';

export const RelatoriosView: React.FC = () => {
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [indicadores, setIndicadores] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getIndicadores();
      setIndicadores(data);
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar indicadores' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/relatorios/exportar-csv', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('midia_central_token')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_midia_central_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast({ type: 'success', title: 'Relatório CSV exportado com sucesso!' });
    } catch {
      showToast({ type: 'error', title: 'Erro ao exportar CSV' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  const { totalCultos, cultosRealizados, totalVoluntarios, confirmacoes, presencas, rankingVoluntarios } = indicadores;

  // Calculate global attendance percentage
  const totalPresencasRegistradas = presencas?.totalRegistradas || 0;
  const taxaAssiduidade =
    totalPresencasRegistradas > 0
      ? Math.round(((presencas?.presentes || 0) / totalPresencasRegistradas) * 100)
      : 100;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Relatórios & Indicadores</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Métricas de assiduidade, frequência por voluntário e relatórios operacionais.
          </p>
        </div>

        <button
          disabled={exporting}
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>{exporting ? 'Exportando...' : 'Exportar Escalas (CSV)'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Assiduidade */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assiduidade Geral</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">{taxaAssiduidade}%</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            {presencas?.presentes || 0} presenças em {totalPresencasRegistradas} escalas avaliadas
          </p>
        </div>

        {/* Cultos Realizados */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cultos Realizados</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white">{cultosRealizados}</p>
          <p className="text-[11px] text-zinc-500 mt-1">De um total de {totalCultos} cultos cadastrados</p>
        </div>

        {/* Voluntários na Ativa */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Membros Ativos</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white">{totalVoluntarios}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Voluntários com perfil ativo</p>
        </div>

        {/* Confirmações Próximos */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmações Futuras</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {confirmacoes?.confirmados || 0}
            <span className="text-base font-normal text-zinc-500"> / {confirmacoes?.total || 0}</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">{confirmacoes?.pendentes || 0} pendentes de resposta</p>
        </div>
      </div>

      {/* Grid: Attendance Breakdown & Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Breakdown Card */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Detalhamento de Frequência Pós-Culto</h3>
          </div>

          <div className="space-y-3 pt-2">
            {/* Presentes */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Presentes Efetivos
                </span>
                <span className="font-bold text-white">{presencas?.presentes || 0}</span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${totalPresencasRegistradas > 0 ? ((presencas?.presentes || 0) / totalPresencasRegistradas) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Ausentes com justificativa */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Ausências Justificadas (Avisadas previamente)
                </span>
                <span className="font-bold text-white">{presencas?.ausentesJustificados || 0}</span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{
                    width: `${totalPresencasRegistradas > 0 ? ((presencas?.ausentesJustificados || 0) / totalPresencasRegistradas) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Ausentes sem justificativa */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  Faltas sem Justificativa
                </span>
                <span className="font-bold text-white">{presencas?.ausentesSemJustificativa || 0}</span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{
                    width: `${totalPresencasRegistradas > 0 ? ((presencas?.ausentesSemJustificativa || 0) / totalPresencasRegistradas) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Substituídos */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  Trocas / Substituições Concluídas
                </span>
                <span className="font-bold text-white">{presencas?.substituidos || 0}</span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${totalPresencasRegistradas > 0 ? ((presencas?.substituidos || 0) / totalPresencasRegistradas) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
            💡 <strong>Nota da Coordenação:</strong> Estes relatórios devem ser utilizados para planejar treinamentos, reconhecer dedicação e redistribuir a carga de trabalho de forma justa entre todos os voluntários.
          </div>
        </div>

        {/* Ranking de Participações dos Voluntários */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Ranking de Engajamento & Escalas</h3>
          </div>

          <div className="divide-y divide-zinc-800/80 max-h-[380px] overflow-y-auto">
            {rankingVoluntarios?.map((vol: any, idx: number) => {
              const pres = vol.presencas || 0;
              const total = vol.count || 0;
              const taxa = total > 0 ? Math.round((pres / total) * 100) : 100;

              return (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 font-bold flex items-center justify-center text-xs shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-zinc-100">{vol.nome}</h4>
                      <p className="text-[11px] text-zinc-500">
                        {pres} presenças confirmadas no altar
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-emerald-400 text-sm">{taxa}%</span>
                    <span className="text-[10px] text-zinc-500 block">em {total} escalas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
