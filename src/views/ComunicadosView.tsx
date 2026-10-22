import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Comunicado } from '../types';
import {
  Megaphone,
  Plus,
  Pin,
  AlertTriangle,
  Clock,
  X
} from 'lucide-react';

export const ComunicadosView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';

  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);

  // New Announcement Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [fixado, setFixado] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const list = await api.getComunicados();
      setComunicados(list);
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar comunicados' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !conteudo) return;
    setSubmitting(true);
    try {
      await api.createComunicado({
        titulo,
        conteudo,
        urgente,
        fixado
      });
      showToast({ type: 'success', title: 'Comunicado publicado para toda a equipe!' });
      setCreateModalOpen(false);
      setTitulo('');
      setConteudo('');
      setUrgente(false);
      setFixado(false);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao publicar comunicado' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Comunicados da Equipe</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Avisos gerais, alinhamentos de transmissão, regras da cabine e reuniões.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Comunicado</span>
          </button>
        )}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
        </div>
      ) : comunicados.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <Megaphone className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-300">Nenhum comunicado publicado no momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comunicados.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all ${
                item.urgente
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : item.fixado
                  ? 'bg-indigo-950/20 border-indigo-500/30'
                  : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {item.fixado && (
                    <span className="p-1 rounded bg-indigo-500/20 text-indigo-300" title="Comunicado Fixado">
                      <Pin className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {item.urgente && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <AlertTriangle className="w-3 h-3" /> Urgente
                    </span>
                  )}
                  <h3 className="font-bold text-base text-white">{item.titulo}</h3>
                </div>

                <span className="text-[11px] text-zinc-500 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(item.publicadoEm).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                {item.conteudo}
              </p>

              <div className="pt-3 mt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500">
                Publicado por: <strong className="text-zinc-300">{item.publicadoPor}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Publicar Comunicado */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Publicar Comunicado para a Equipe</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Todos os voluntários receberão uma notificação no aplicativo.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Título do Aviso *</label>
                <input
                  required
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Reunião de alinhamento no sábado às 16h"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Mensagem / Conteúdo *</label>
                <textarea
                  required
                  rows={4}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Digite as orientações para a equipe de mídia..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={urgente}
                    onChange={(e) => setUrgente(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Marcar como Urgente</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={fixado}
                    onChange={(e) => setFixado(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Fixar no Topo</span>
                </label>
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  {submitting ? 'Publicando...' : 'Publicar Comunicado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
