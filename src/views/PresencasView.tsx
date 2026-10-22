import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { Culto, EscalaItem, User, PresencaStatus } from '../types';
import {
  ClipboardCheck,
  Calendar,
  Save,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const PresencasView: React.FC = () => {
  const { showToast } = useNotifications();

  const [cultos, setCultos] = useState<Culto[]>([]);
  const [escalas, setEscalas] = useState<EscalaItem[]>([]);
  const [voluntarios, setVoluntarios] = useState<User[]>([]);
  const [selectedCultoId, setSelectedCultoId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for editing attendance row by row
  const [presencasLocais, setPresencasLocais] = useState<Record<string, { status: PresencaStatus; obs: string }>>({});

  const loadData = useCallback(async () => {
    try {
      const [cultosData, escalasList, usersList] = await Promise.all([
        api.getCultos(),
        api.getEscalas(),
        api.getUsers()
      ]);

      setCultos(cultosData);
      setEscalas(escalasList);
      setVoluntarios(usersList);

      if (cultosData.length > 0) {
        // Prefer past or realized services
        const past = cultosData.find((c) => c.status === 'realizado') || cultosData[0];
        setSelectedCultoId(past.id);
      }
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar cultos' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync local attendance records whenever selectedCultoId or escalas changes
  useEffect(() => {
    if (!selectedCultoId) return;
    const items = escalas.filter((e) => e.cultoId === selectedCultoId);
    const map: Record<string, { status: PresencaStatus; obs: string }> = {};

    items.forEach((item) => {
      // Default to what's already saved or suggest based on advance confirmation
      const currentStatus: PresencaStatus = item.statusPresenca || (item.statusConfirmacao === 'confirmado' ? 'presente' : 'ausente_justificado');
      map[item.id] = {
        status: currentStatus,
        obs: item.observacaoPresenca || ''
      };
    });

    setPresencasLocais(map);
  }, [selectedCultoId, escalas]);

  const activeCulto = cultos.find((c) => c.id === selectedCultoId);
  const itemsDoCulto = escalas.filter((e) => e.cultoId === selectedCultoId);

  const handleStatusChange = (escalaId: string, status: PresencaStatus) => {
    setPresencasLocais((prev) => ({
      ...prev,
      [escalaId]: { ...prev[escalaId], status }
    }));
  };

  const handleObsChange = (escalaId: string, obs: string) => {
    setPresencasLocais((prev) => ({
      ...prev,
      [escalaId]: { ...prev[escalaId], obs }
    }));
  };

  const handleSalvarPresencas = async () => {
    setSaving(true);
    try {
      await Promise.all(
        itemsDoCulto.map((item) => {
          const rec = presencasLocais[item.id];
          if (!rec) return Promise.resolve();
          return api.registrarPresenca(item.id, rec.status, rec.obs);
        })
      );

      // If cult status wasn't 'realizado', mark as realizado
      if (activeCulto && activeCulto.status !== 'realizado') {
        await api.updateCulto(activeCulto.id, { status: 'realizado' });
      }

      showToast({
        type: 'success',
        title: 'Presenças Salvas!',
        message: 'O relatório e a frequência dos voluntários foram atualizados.'
      });
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao salvar presenças' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Registro de Presença Pós-Culto
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Confirme a participação efetiva de cada voluntário após o encerramento do culto.
          </p>
        </div>

        {itemsDoCulto.length > 0 && (
          <button
            disabled={saving}
            onClick={handleSalvarPresencas}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Gravando...' : 'Salvar Registro de Presença'}</span>
          </button>
        )}
      </div>

      {/* Select Culto */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
          Selecione o Culto Realizado
        </label>
        <select
          value={selectedCultoId}
          onChange={(e) => setSelectedCultoId(e.target.value)}
          className="w-full max-w-lg px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:border-indigo-500"
        >
          {cultos.map((c) => (
            <option key={c.id} value={c.id}>
              {new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {c.horarioInicio} - {c.titulo} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {/* Culto Banner */}
      {activeCulto && (
        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 uppercase">{activeCulto.tipo}</span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-400">{activeCulto.local}</span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">{activeCulto.titulo}</h3>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{activeCulto.data}</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400 ml-2" />
              <span>{activeCulto.horarioInicio} às {activeCulto.horarioTermino}</span>
            </p>
          </div>

          <div className="text-xs text-zinc-400 bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-800">
            <span className="text-zinc-500">Regra:</span> Confirmação prévia é distinta de presença física comprovada.
          </div>
        </div>
      )}

      {/* Attendance Sheet */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Lista de Chamada & Ocorrências</h3>
          </div>
          <span className="text-xs text-zinc-400">{itemsDoCulto.length} voluntários escalados</span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
          </div>
        ) : itemsDoCulto.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Nenhum voluntário escalado neste culto.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {itemsDoCulto.map((item) => {
              const voluntario = voluntarios.find((v) => v.id === item.usuarioId);
              const localRec = presencasLocais[item.id] || { status: 'presente', obs: '' };

              return (
                <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 md:w-1/3">
                    <h4 className="font-bold text-sm text-white truncate">
                      {voluntario?.nome || 'Voluntário'}
                    </h4>
                    <p className="text-xs text-indigo-300 font-medium">{item.funcaoNome}</p>
                    <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                      <span>Confirmação prévia:</span>
                      <span className="font-semibold text-zinc-300">{item.statusConfirmacao}</span>
                    </div>
                  </div>

                  {/* Presence Selector Radio / Buttons */}
                  <div className="flex-1 flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'presente', label: 'Presente', color: 'bg-emerald-600' },
                      { id: 'ausente_justificado', label: 'Ausente (Justificado)', color: 'bg-amber-600' },
                      { id: 'ausente_sem_justificativa', label: 'Falta sem Justificativa', color: 'bg-rose-600' },
                      { id: 'substituido', label: 'Substituído', color: 'bg-blue-600' }
                    ].map((btn) => {
                      const isSelected = localRec.status === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => handleStatusChange(item.id, btn.id as PresencaStatus)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? `${btn.color} text-white shadow-md`
                              : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                          }`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Notes / Observação de presença */}
                  <div className="md:w-1/4">
                    <input
                      type="text"
                      value={localRec.obs}
                      onChange={(e) => handleObsChange(item.id, e.target.value)}
                      placeholder="Observação da presença..."
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {itemsDoCulto.length > 0 && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>O registro atualiza os índices de assiduidade nos relatórios gerais.</span>
            </div>
            <button
              disabled={saving}
              onClick={handleSalvarPresencas}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20"
            >
              {saving ? 'Gravando...' : 'Salvar Presenças'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
