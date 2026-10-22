import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Culto, MusicaSetlist } from '../types';
import {
  Music2,
  Calendar,
  ExternalLink,
  Plus,
  Play,
  Trash2,
  Edit2,
  X,
  FileText,
  ListOrdered
} from 'lucide-react';

export const SetlistsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';
  const isLouvorMember =
    isAdmin ||
    user?.perfil === 'ministro_louvor' ||
    (user as any)?.funcoesIds?.some((f: string) => f.toLowerCase().includes('louvor') || f.toLowerCase().includes('musico') || f.toLowerCase().includes('ministro') || f.toLowerCase().includes('vocal')) ||
    user?.funcoes?.some((f) => f.toLowerCase().includes('louvor') || f.toLowerCase().includes('música') || f.toLowerCase().includes('musico') || f.toLowerCase().includes('ministro') || f.toLowerCase().includes('vocal')) ||
    (user as any)?.departamentoId === 'dep-louvor' ||
    (user as any)?.departamentoIds?.includes('dep-louvor');

  const canManageSetlist = isAdmin || isLouvorMember;

  const [cultos, setCultos] = useState<Culto[]>([]);
  const [selectedCultoId, setSelectedCultoId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Live Stage View mode
  const [liveMode, setLiveMode] = useState(false);

  // Song Modal (Add/Edit)
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [songForm, setSongForm] = useState<Partial<MusicaSetlist>>({
    titulo: '',
    artista: '',
    tom: 'G',
    linkReferencia: '',
    linkCifra: '',
    observacoes: ''
  });

  const loadData = useCallback(async () => {
    try {
      const list = await api.getCultos();
      setCultos(list);
      if (list.length > 0 && !selectedCultoId) {
        // Default to upcoming service
        const todayStr = new Date().toISOString().split('T')[0];
        const next = list.find((c) => c.data >= todayStr && c.status !== 'cancelado') || list[0];
        setSelectedCultoId(next.id);
      }
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar cultos' });
    } finally {
      setLoading(false);
    }
  }, [selectedCultoId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCulto = cultos.find((c) => c.id === selectedCultoId);
  const setlist = activeCulto?.setlist || [];

  const handleOpenAddSong = () => {
    setEditingSongId(null);
    setSongForm({
      titulo: '',
      artista: '',
      tom: 'G',
      linkReferencia: '',
      linkCifra: '',
      observacoes: ''
    });
    setSongModalOpen(true);
  };

  const handleOpenEditSong = (song: MusicaSetlist) => {
    setEditingSongId(song.id);
    setSongForm({ ...song });
    setSongModalOpen(true);
  };

  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCulto) return;

    try {
      if (editingSongId) {
        await api.updateSongInSetlist(activeCulto.id, editingSongId, songForm);
        showToast({ type: 'success', title: 'Música atualizada no setlist!' });
      } else {
        await api.addSongToSetlist(activeCulto.id, {
          titulo: songForm.titulo || 'Música',
          artista: songForm.artista || '',
          tom: songForm.tom || 'G',
          linkReferencia: songForm.linkReferencia,
          linkCifra: songForm.linkCifra,
          observacoes: songForm.observacoes,
          responsavel: user?.nome
        });
        showToast({ type: 'success', title: 'Música adicionada ao setlist!' });
      }
      setSongModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao salvar música', message: err?.message });
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!activeCulto) return;
    try {
      await api.deleteSongFromSetlist(activeCulto.id, songId);
      showToast({ type: 'success', title: 'Música removida do setlist' });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao remover música', message: err?.message });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Setlist & Músicas</h2>
            {isLouvorMember && !isAdmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Equipe de Louvor
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Acompanhe a ordem do louvor, tons, links de cifra e referências para projeção e som.
            {isLouvorMember && ' Você pode adicionar e gerenciar o repertório.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {setlist.length > 0 && (
            <button
              onClick={() => setLiveMode(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Modo Culto ao Vivo</span>
            </button>
          )}

          {canManageSetlist && (
            <button
              onClick={handleOpenAddSong}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Música</span>
            </button>
          )}
        </div>
      </div>

      {/* Select Culto */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Selecione o Culto
          </label>
          <select
            value={selectedCultoId}
            onChange={(e) => setSelectedCultoId(e.target.value)}
            className="w-full max-w-md px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm focus:border-indigo-500"
          >
            {cultos.map((c) => (
              <option key={c.id} value={c.id}>
                {new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {c.titulo} ({c.tipo})
              </option>
            ))}
          </select>
        </div>

        {activeCulto && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>{activeCulto.data} • {activeCulto.horarioInicio}</span>
          </div>
        )}
      </div>

      {/* Setlist List */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Canções do Culto</h3>
          </div>
          <span className="text-xs text-zinc-400">{setlist.length} músicas cadastradas</span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
          </div>
        ) : setlist.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Nenhuma música cadastrada para este culto.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {setlist.map((song) => (
              <div
                key={song.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm shrink-0">
                    {song.ordem}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{song.titulo}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Tom: {song.tom}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{song.artista}</p>
                    {song.observacoes && (
                      <p className="text-xs text-zinc-500 italic mt-0.5">Obs: {song.observacoes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {song.linkCifra && (
                    <a
                      href={song.linkCifra}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Cifra / Letra</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  )}

                  {song.linkReferencia && (
                    <a
                      href={song.linkReferencia}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                    >
                      <Play className="w-3.5 h-3.5 text-rose-400" />
                      <span>Áudio / Vídeo</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  )}

                  {canManageSetlist && (
                    <div className="flex items-center gap-1 pl-2 border-l border-zinc-800">
                      <button
                        onClick={() => handleOpenEditSong(song)}
                        title="Editar música"
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song.id)}
                        title="Remover música"
                        className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Program Blocks Summary */}
      {activeCulto && activeCulto.programacao?.length > 0 && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-indigo-400" />
              <span>Ordem do Culto (Programação da Transmissão)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {activeCulto.programacao.map((bloco) => (
              <div
                key={bloco.id}
                className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold">BLOCO {bloco.ordem}</span>
                  <p className="font-semibold text-zinc-200 mt-0.5">{bloco.titulo}</p>
                </div>
                {bloco.duracaoMinutos && (
                  <span className="text-[10px] font-medium text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">
                    {bloco.duracaoMinutos}m
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN / MODAL: Live Stage View (Modo Culto ao Vivo) */}
      {liveMode && activeCulto && (
        <div className="fixed inset-0 z-50 bg-black text-white p-6 sm:p-10 flex flex-col justify-between overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                MODO CULTO AO VIVO • {activeCulto.tipo}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">{activeCulto.titulo}</h2>
              <p className="text-xs text-zinc-400">{activeCulto.data} • {activeCulto.horarioInicio}</p>
            </div>
            <button
              onClick={() => setLiveMode(false)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Song Sequence */}
            <div>
              <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                <Music2 className="w-5 h-5" />
                <span>Sequência das Músicas</span>
              </h3>
              <div className="space-y-3">
                {setlist.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-purple-400">{m.ordem}</span>
                      <div>
                        <h4 className="text-lg font-bold text-white">{m.titulo}</h4>
                        <p className="text-xs text-zinc-400">{m.artista}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-xl text-sm font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        {m.tom}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Program sequence */}
            <div>
              <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <ListOrdered className="w-5 h-5" />
                <span>Ordem dos Blocos</span>
              </h3>
              <div className="space-y-2.5">
                {activeCulto.programacao?.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-xs">
                        {b.ordem}
                      </span>
                      <span className="font-bold text-zinc-200">{b.titulo}</span>
                    </div>
                    {b.duracaoMinutos && (
                      <span className="text-xs text-zinc-400">{b.duracaoMinutos} min</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button
              onClick={() => setLiveMode(false)}
              className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
            >
              Sair do Modo Ao Vivo (ESC)
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Song Form (Add/Edit) */}
      {songModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">
              {editingSongId ? 'Editar Música' : 'Adicionar Música ao Setlist'}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Culto: {activeCulto?.titulo}
            </p>

            <form onSubmit={handleSaveSong} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome da Canção *</label>
                <input
                  required
                  type="text"
                  value={songForm.titulo}
                  onChange={(e) => setSongForm({ ...songForm, titulo: e.target.value })}
                  placeholder="Ex: Bondade de Deus"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Artista / Intérprete</label>
                  <input
                    type="text"
                    value={songForm.artista}
                    onChange={(e) => setSongForm({ ...songForm, artista: e.target.value })}
                    placeholder="Ex: Bethel / Isaias Saad"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Tom Musical *</label>
                  <input
                    required
                    type="text"
                    value={songForm.tom}
                    onChange={(e) => setSongForm({ ...songForm, tom: e.target.value })}
                    placeholder="Ex: G, Em, Bb"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Link de Cifra / Letra</label>
                <input
                  type="url"
                  value={songForm.linkCifra}
                  onChange={(e) => setSongForm({ ...songForm, linkCifra: e.target.value })}
                  placeholder="https://cifraclub.com.br/..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Link de Áudio / Vídeo (YouTube, Spotify)</label>
                <input
                  type="url"
                  value={songForm.linkReferencia}
                  onChange={(e) => setSongForm({ ...songForm, linkReferencia: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Observações de Execução</label>
                <input
                  type="text"
                  value={songForm.observacoes}
                  onChange={(e) => setSongForm({ ...songForm, observacoes: e.target.value })}
                  placeholder="Ex: Solo de guitarra antes do 2º refrão, ministração suave..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSongModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Salvar Música
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
