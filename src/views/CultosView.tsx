import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Culto, BlocoProgramacao, MusicaSetlist, EscalaItem } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Copy,
  Trash2,
  Edit2,
  X,
  Music2,
  ListOrdered,
  Users
} from 'lucide-react';

export const CultosView: React.FC<{ onNavigateToEscalas?: (cultoId: string) => void }> = ({ onNavigateToEscalas }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isAdmin = user?.perfil === 'admin';

  const [cultos, setCultos] = useState<Culto[]>([]);
  const [escalas, setEscalas] = useState<EscalaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Modal states
  const [cultoModalOpen, setCultoModalOpen] = useState(false);
  const [editingCulto, setEditingCulto] = useState<Culto | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [cultoToDuplicate, setCultoToDuplicate] = useState<Culto | null>(null);
  const [duplicateData, setDuplicateData] = useState({ novaData: '', novoHorarioInicio: '', novoHorarioTermino: '' });

  // Detail Drawer
  const [selectedCulto, setSelectedCulto] = useState<Culto | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Culto>>({
    titulo: '',
    tipo: 'Domingo Noite',
    data: new Date().toISOString().split('T')[0],
    horarioInicio: '19:00',
    horarioTermino: '21:00',
    local: 'Templo Principal',
    tema: '',
    pregador: '',
    descricao: '',
    observacoes: '',
    status: 'planejado',
    programacao: [],
    setlist: []
  });

  const loadData = useCallback(async () => {
    try {
      const [cultosData, escalasData] = await Promise.all([api.getCultos(), api.getEscalas()]);
      setCultos(cultosData);
      setEscalas(escalasData);
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar cultos' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingCulto(null);
    setFormData({
      titulo: '',
      tipo: 'Domingo Noite',
      data: new Date().toISOString().split('T')[0],
      horarioInicio: '19:00',
      horarioTermino: '21:00',
      local: 'Templo Principal',
      tema: '',
      pregador: '',
      descricao: '',
      observacoes: '',
      status: 'planejado',
      programacao: [
        { id: '1', ordem: 1, titulo: 'Abertura & Oração', duracaoMinutos: 5 },
        { id: '2', ordem: 2, titulo: 'Louvor Congregacional', duracaoMinutos: 25 },
        { id: '3', ordem: 3, titulo: 'Avisos & Ofertas', duracaoMinutos: 10 },
        { id: '4', ordem: 4, titulo: 'Palavra / Mensagem', duracaoMinutos: 45 },
        { id: '5', ordem: 5, titulo: 'Encerramento', duracaoMinutos: 5 }
      ],
      setlist: []
    });
    setCultoModalOpen(true);
  };

  const handleOpenEdit = (culto: Culto) => {
    setEditingCulto(culto);
    setFormData({ ...culto });
    setCultoModalOpen(true);
  };

  const handleSaveCulto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCulto) {
        await api.updateCulto(editingCulto.id, formData);
        showToast({ type: 'success', title: 'Culto atualizado com sucesso!' });
      } else {
        await api.createCulto(formData);
        showToast({ type: 'success', title: 'Culto criado com sucesso!' });
      }
      setCultoModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao salvar culto', message: err.message });
    }
  };

  const handleDeleteCulto = async (id: string, titulo: string) => {
    if (!confirm(`Tem certeza que deseja excluir o culto "${titulo}" e suas escalas?`)) return;
    try {
      await api.deleteCulto(id);
      showToast({ type: 'success', title: 'Culto excluído' });
      if (selectedCulto?.id === id) setSelectedCulto(null);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao excluir culto' });
    }
  };

  const handleOpenDuplicate = (culto: Culto) => {
    setCultoToDuplicate(culto);
    // Suggest 7 days ahead
    const nextDate = new Date(culto.data + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 7);
    setDuplicateData({
      novaData: nextDate.toISOString().split('T')[0],
      novoHorarioInicio: culto.horarioInicio,
      novoHorarioTermino: culto.horarioTermino
    });
    setDuplicateModalOpen(true);
  };

  const handleConfirmDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cultoToDuplicate) return;
    try {
      await api.duplicarCulto(cultoToDuplicate.id, duplicateData);
      showToast({ type: 'success', title: 'Culto duplicado com sucesso!' });
      setDuplicateModalOpen(false);
      loadData();
    } catch {
      showToast({ type: 'error', title: 'Erro ao duplicar culto' });
    }
  };

  // Helper for program block edits
  const addProgramBlock = () => {
    const list = formData.programacao || [];
    const nextOrder = list.length + 1;
    const newBlock: BlocoProgramacao = {
      id: `b-${Date.now()}`,
      ordem: nextOrder,
      titulo: 'Novo Bloco',
      duracaoMinutos: 10
    };
    setFormData({ ...formData, programacao: [...list, newBlock] });
  };

  const removeProgramBlock = (id: string) => {
    const list = (formData.programacao || []).filter((b) => b.id !== id);
    setFormData({ ...formData, programacao: list });
  };

  // Helper for setlist edits inside modal
  const addSong = () => {
    const list = formData.setlist || [];
    const newSong: MusicaSetlist = {
      id: `m-${Date.now()}`,
      ordem: list.length + 1,
      titulo: '',
      artista: '',
      tom: 'G'
    };
    setFormData({ ...formData, setlist: [...list, newSong] });
  };

  const removeSong = (id: string) => {
    const list = (formData.setlist || []).filter((s) => s.id !== id);
    setFormData({ ...formData, setlist: list });
  };

  const filteredCultos = cultos.filter((c) => {
    if (filterStatus === 'todos') return true;
    return c.status === filterStatus;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Cultos & Eventos</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Cadastre programações, horários, setlists e acompanhe as equipes.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Culto</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['todos', 'planejado', 'confirmado', 'realizado', 'cancelado'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize shrink-0 transition-all ${
              filterStatus === status
                ? 'bg-zinc-100 text-zinc-900 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Cultos Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
        </div>
      ) : filteredCultos.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Nenhum culto encontrado com este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCultos.map((culto) => {
            const cultoEscalas = escalas.filter((e) => e.cultoId === culto.id);
            const confirmados = cultoEscalas.filter((e) => e.statusConfirmacao === 'confirmado').length;

            const statusColors: Record<string, string> = {
              planejado: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              confirmado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              realizado: 'bg-zinc-800 text-zinc-400 border-zinc-700',
              cancelado: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            };

            return (
              <div
                key={culto.id}
                className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      {culto.tipo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                        statusColors[culto.status] || 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {culto.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                      {culto.titulo}
                    </h3>
                    {culto.tema && (
                      <p className="text-xs text-zinc-400 italic mt-0.5">"{culto.tema}"</p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-300 pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {new Date(culto.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{culto.horarioInicio} às {culto.horarioTermino}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{culto.local}</span>
                    </div>
                  </div>

                  {/* Badges for counts */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                      <Users className="w-3 h-3 text-indigo-400" />
                      {cultoEscalas.length} escalados ({confirmados} conf.)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                      <Music2 className="w-3 h-3 text-indigo-400" />
                      {culto.setlist?.length || 0} músicas
                    </span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 mt-3 border-t border-zinc-800/80 flex items-center justify-between gap-1">
                  <button
                    onClick={() => setSelectedCulto(culto)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 py-1.5 px-2.5 rounded-lg hover:bg-zinc-800"
                  >
                    Ver Programação
                  </button>

                  <div className="flex items-center gap-1">
                    {onNavigateToEscalas && (
                      <button
                        onClick={() => onNavigateToEscalas(culto.id)}
                        title="Ver escala"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                    )}

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenDuplicate(culto)}
                          title="Duplicar como modelo"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(culto)}
                          title="Editar culto"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCulto(culto.id, culto.titulo)}
                          title="Excluir culto"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL: Service Program & Setlist Drawer */}
      {selectedCulto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase">{selectedCulto.tipo}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedCulto.titulo}</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {new Date(selectedCulto.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {selectedCulto.horarioInicio} às {selectedCulto.horarioTermino} • {selectedCulto.local}
                </p>
              </div>
              <button
                onClick={() => setSelectedCulto(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Service description & preacher */}
              {(selectedCulto.pregador || selectedCulto.tema || selectedCulto.observacoes) && (
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1 text-xs">
                  {selectedCulto.tema && (
                    <p><span className="text-zinc-500 font-semibold">Tema:</span> <span className="text-zinc-200">{selectedCulto.tema}</span></p>
                  )}
                  {selectedCulto.pregador && (
                    <p><span className="text-zinc-500 font-semibold">Pregador:</span> <span className="text-zinc-200">{selectedCulto.pregador}</span></p>
                  )}
                  {selectedCulto.observacoes && (
                    <p><span className="text-zinc-500 font-semibold">Observações:</span> <span className="text-zinc-300">{selectedCulto.observacoes}</span></p>
                  )}
                </div>
              )}

              {/* Order of Service / Program Blocks */}
              <div>
                <h4 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-indigo-400" />
                  <span>Programação do Culto ({selectedCulto.programacao?.length || 0} blocos)</span>
                </h4>

                <div className="space-y-2">
                  {selectedCulto.programacao?.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">Nenhum bloco cadastrado.</p>
                  ) : (
                    selectedCulto.programacao?.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-zinc-800 text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                            {b.ordem}
                          </span>
                          <div>
                            <span className="font-semibold text-zinc-200">{b.titulo}</span>
                            {b.responsavel && (
                              <span className="text-[11px] text-zinc-500 block">Resp: {b.responsavel}</span>
                            )}
                          </div>
                        </div>
                        {b.duracaoMinutos && (
                          <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2 py-1 rounded">
                            {b.duracaoMinutos} min
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Song Setlist */}
              <div>
                <h4 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-indigo-400" />
                  <span>Setlist de Músicas ({selectedCulto.setlist?.length || 0})</span>
                </h4>

                <div className="space-y-2">
                  {selectedCulto.setlist?.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">Nenhuma música cadastrada.</p>
                  ) : (
                    selectedCulto.setlist?.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[11px]">
                            {s.ordem}
                          </span>
                          <div>
                            <span className="font-semibold text-zinc-200">{s.titulo}</span>
                            <span className="text-[11px] text-zinc-500 block">{s.artista}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Tom: {s.tom}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end">
              <button
                onClick={() => setSelectedCulto(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Culto */}
      {cultoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                {editingCulto ? 'Editar Culto' : 'Cadastrar Novo Culto'}
              </h3>
              <button
                onClick={() => setCultoModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCulto} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Título do Culto *</label>
                  <input
                    required
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ex: Culto de Celebração"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Tipo de Evento</label>
                  <input
                    type="text"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    placeholder="Ex: Domingo Noite, Quarta, Jovens, Conferência"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Data *</label>
                  <input
                    required
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Início (24h) *</label>
                  <input
                    required
                    type="time"
                    value={formData.horarioInicio}
                    onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Término (24h) *</label>
                  <input
                    required
                    type="time"
                    value={formData.horarioTermino}
                    onChange={(e) => setFormData({ ...formData, horarioTermino: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Local</label>
                  <input
                    type="text"
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                    placeholder="Templo Principal"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Pregador / Responsável</label>
                  <input
                    type="text"
                    value={formData.pregador}
                    onChange={(e) => setFormData({ ...formData, pregador: e.target.value })}
                    placeholder="Ex: Pastor Carlos"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Tema da Mensagem</label>
                <input
                  type="text"
                  value={formData.tema}
                  onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                  placeholder="Ex: Vivendo pela Fé"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Status do Evento</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                >
                  <option value="planejado">Planejado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              {/* Program blocks builder */}
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Ordem do Culto (Blocos)</span>
                  <button
                    type="button"
                    onClick={addProgramBlock}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Bloco
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.programacao?.map((bloco, idx) => (
                    <div key={bloco.id} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500 w-4">{idx + 1}</span>
                      <input
                        type="text"
                        value={bloco.titulo}
                        onChange={(e) => {
                          const updated = [...(formData.programacao || [])];
                          updated[idx].titulo = e.target.value;
                          setFormData({ ...formData, programacao: updated });
                        }}
                        placeholder="Nome do bloco (Ex: Louvor)"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs"
                      />
                      <input
                        type="number"
                        value={bloco.duracaoMinutos || ''}
                        onChange={(e) => {
                          const updated = [...(formData.programacao || [])];
                          updated[idx].duracaoMinutos = parseInt(e.target.value, 10);
                          setFormData({ ...formData, programacao: updated });
                        }}
                        placeholder="Min"
                        className="w-16 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs text-center"
                      />
                      <button
                        type="button"
                        onClick={() => removeProgramBlock(bloco.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setlist songs builder */}
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Músicas do Louvor</span>
                  <button
                    type="button"
                    onClick={addSong}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Música
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.setlist?.map((song, idx) => (
                    <div key={song.id} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={song.titulo}
                        onChange={(e) => {
                          const updated = [...(formData.setlist || [])];
                          updated[idx].titulo = e.target.value;
                          setFormData({ ...formData, setlist: updated });
                        }}
                        placeholder="Nome da música"
                        className="col-span-6 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs"
                      />
                      <input
                        type="text"
                        value={song.artista}
                        onChange={(e) => {
                          const updated = [...(formData.setlist || [])];
                          updated[idx].artista = e.target.value;
                          setFormData({ ...formData, setlist: updated });
                        }}
                        placeholder="Artista"
                        className="col-span-4 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs"
                      />
                      <input
                        type="text"
                        value={song.tom}
                        onChange={(e) => {
                          const updated = [...(formData.setlist || [])];
                          updated[idx].tom = e.target.value;
                          setFormData({ ...formData, setlist: updated });
                        }}
                        placeholder="Tom"
                        className="col-span-1 px-1 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs text-center"
                      />
                      <button
                        type="button"
                        onClick={() => removeSong(song.id)}
                        className="col-span-1 p-1 text-zinc-500 hover:text-rose-400 flex justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCultoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Salvar Culto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Duplicate Service as Template */}
      {duplicateModalOpen && cultoToDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-1">Duplicar Culto Modelo</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Crie uma nova data mantendo a programação e o setlist como modelo, sem duplicar confirmações ou presenças passadas.
            </p>

            <form onSubmit={handleConfirmDuplicate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nova Data *</label>
                <input
                  required
                  type="date"
                  value={duplicateData.novaData}
                  onChange={(e) => setDuplicateData({ ...duplicateData, novaData: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Horário Início</label>
                  <input
                    required
                    type="time"
                    value={duplicateData.novoHorarioInicio}
                    onChange={(e) => setDuplicateData({ ...duplicateData, novoHorarioInicio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Horário Término</label>
                  <input
                    required
                    type="time"
                    value={duplicateData.novoHorarioTermino}
                    onChange={(e) => setDuplicateData({ ...duplicateData, novoHorarioTermino: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDuplicateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Duplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
