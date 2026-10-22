import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { ConfiguracaoIgreja, Departamento, FuncaoEquipe, User, AuditLog, UserRole } from '../types';
import {
  Settings,
  Users,
  Shield,
  Palette,
  Layers,
  Briefcase,
  Check,
  Plus,
  Trash2,
  Edit2,
  Clock,
  X,
  Music2
} from 'lucide-react';

export const ConfiguracoesView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useNotifications();
  const { accentColor, setAccentColor } = useTheme();

  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'usuarios' | 'funcoes' | 'departamentos' | 'auditoria'>('geral');
  const [loading, setLoading] = useState(true);

  // System Config
  const [config, setConfig] = useState<ConfiguracaoIgreja>({
    nomeIgreja: 'Comunidade da Fé',
    nomeAplicativo: 'Mídia Central',
    slogan: '',
    corDestaque: '#6366f1',
    temaPadrao: 'dark',
    permiteCadastroPublico: true,
    aprovarCadastrosManual: false,
    permitirTrocaComSugestao: true
  });

  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoEquipe[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // User Edit Modal
  const [editUserModal, setEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});

  // User Create Modal
  const [newUserModal, setNewUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    nome: string;
    email: string;
    password: string;
    telefone: string;
    perfil: UserRole;
    disponibilidade: string;
  }>({
    nome: '',
    email: '',
    password: '',
    telefone: '',
    perfil: 'voluntario',
    disponibilidade: ''
  });

  // Role Modal
  const [roleModal, setRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState<{ id?: string; nome: string; departamentoId: string; cor: string }>({
    nome: '',
    departamentoId: '',
    cor: '#3B82F6'
  });

  // Department Modal
  const [deptModal, setDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState<{ nome: string; cor: string; descricao: string }>({
    nome: '',
    cor: '#10B981',
    descricao: ''
  });

  const loadAll = useCallback(async () => {
    try {
      const [configData, usersList, logsList] = await Promise.all([
        api.getConfig(),
        api.getUsers(),
        api.getAuditLogs()
      ]);

      setConfig(configData.config);
      setDepartamentos(configData.departamentos);
      setFuncoes(configData.funcoes);
      setUsuarios(usersList);
      setAuditLogs(logsList);
    } catch {
      showToast({ type: 'error', title: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveGeneralConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateConfig(config);
      setAccentColor(config.corDestaque);
      showToast({ type: 'success', title: 'Configurações salvas!' });
      loadAll();
    } catch {
      showToast({ type: 'error', title: 'Erro ao salvar configurações' });
    }
  };

  // User Actions
  const handleOpenEditUser = (u: User) => {
    setSelectedUser(u);
    setUserFormData({
      nome: u.nome,
      perfil: u.perfil,
      status: u.status,
      telefone: u.telefone,
      disponibilidade: u.disponibilidade,
      funcoes: u.funcoes || []
    });
    setEditUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.updateUser(selectedUser.id, userFormData);
      showToast({ type: 'success', title: 'Usuário atualizado com sucesso!' });
      setEditUserModal(false);
      loadAll();
      refreshUser();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao atualizar', message: err.message });
    }
  };

  const handleApproveUser = async (u: User) => {
    try {
      await api.updateUser(u.id, { status: 'ativo' });
      showToast({ type: 'success', title: `Cadastro de ${u.nome} aprovado!` });
      loadAll();
    } catch {
      showToast({ type: 'error', title: 'Erro ao aprovar cadastro' });
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.nome || !newUserForm.email) {
      showToast({ type: 'error', title: 'Nome e email são obrigatórios' });
      return;
    }
    try {
      await api.createUser({
        nome: newUserForm.nome,
        email: newUserForm.email,
        password: newUserForm.password || 'midia123',
        telefone: newUserForm.telefone,
        perfil: newUserForm.perfil,
        disponibilidade: newUserForm.disponibilidade
      });
      showToast({
        type: 'success',
        title: 'Usuário cadastrado com sucesso!',
        message: `Novo ${newUserForm.perfil === 'ministro_louvor' ? 'Ministro de Louvor' : newUserForm.perfil === 'admin' ? 'Administrador' : 'Voluntário'} adicionado.`
      });
      setNewUserModal(false);
      setNewUserForm({
        nome: '',
        email: '',
        password: '',
        telefone: '',
        perfil: 'voluntario',
        disponibilidade: ''
      });
      loadAll();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro ao criar usuário', message: err.message });
    }
  };

  // Roles CRUD
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (roleForm.id) {
        await api.updateFuncao(roleForm.id, roleForm);
        showToast({ type: 'success', title: 'Função atualizada!' });
      } else {
        await api.createFuncao(roleForm);
        showToast({ type: 'success', title: 'Função cadastrada com sucesso!' });
      }
      setRoleModal(false);
      loadAll();
    } catch {
      showToast({ type: 'error', title: 'Erro ao salvar função' });
    }
  };

  const handleDeleteRole = async (id: string, nome: string) => {
    if (!confirm(`Excluir a função "${nome}"?`)) return;
    try {
      await api.deleteFuncao(id);
      showToast({ type: 'success', title: 'Função excluída' });
      loadAll();
    } catch {
      showToast({ type: 'error', title: 'Erro ao excluir função' });
    }
  };

  // Dept CRUD
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDepartamento(deptForm);
      showToast({ type: 'success', title: 'Departamento criado!' });
      setDeptModal(false);
      loadAll();
    } catch {
      showToast({ type: 'error', title: 'Erro ao salvar departamento' });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Configurações & Equipe</h2>
        <p className="text-xs sm:text-sm text-zinc-400">
          Personalize a identidade da igreja, gerencie permissões, funções e visualize a auditoria.
        </p>
      </div>

      {/* Subtabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800">
        {[
          { id: 'geral', label: 'Identidade & Geral', icon: Settings },
          { id: 'usuarios', label: `Usuários & Permissões (${usuarios.length})`, icon: Users },
          { id: 'funcoes', label: `Funções (${funcoes.length})`, icon: Briefcase },
          { id: 'departamentos', label: `Departamentos (${departamentos.length})`, icon: Layers },
          { id: 'auditoria', label: 'Histórico & Auditoria', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
        </div>
      ) : activeSubTab === 'geral' ? (
        /* GENERAL & CHURCH BRANDING */
        <div className="max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Palette className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Identidade da Igreja & Aplicativo</h3>
          </div>

          <form onSubmit={handleSaveGeneralConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Nome da Igreja *</label>
              <input
                required
                type="text"
                value={config.nomeIgreja}
                onChange={(e) => setConfig({ ...config, nomeIgreja: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Nome do Aplicativo</label>
              <input
                type="text"
                value={config.nomeAplicativo}
                onChange={(e) => setConfig({ ...config, nomeAplicativo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Slogan / Visão</label>
              <input
                type="text"
                value={config.slogan || ''}
                onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
                placeholder="Ex: Excelência no altar e nas telas"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Cor de Destaque da Interface</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.corDestaque}
                  onChange={(e) => setConfig({ ...config, corDestaque: e.target.value })}
                  className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 p-1 cursor-pointer"
                />
                <span className="text-xs text-zinc-400 font-mono">{config.corDestaque}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400">
                Regras de Acesso e Cadastro
              </h4>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.aprovarCadastrosManual}
                  onChange={(e) => setConfig({ ...config, aprovarCadastrosManual: e.target.checked })}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-0 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    Aprovação Manual de Novos Cadastros
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Quando ativado, voluntários que se cadastrarem ficam como "pendentes" até o administrador aprovar.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.permitirTrocaComSugestao}
                  onChange={(e) => setConfig({ ...config, permitirTrocaComSugestao: e.target.checked })}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-0 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    Permitir que o voluntário sugira substituto na troca
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Facilita o remanejamento antes do coordenador validar.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      ) : activeSubTab === 'usuarios' ? (
        /* USERS MANAGEMENT */
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">Voluntários e Administradores</h3>
            </div>
            <button
              onClick={() => setNewUserModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Usuário</span>
            </button>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {usuarios.map((u) => {
              const isPendente = u.status === 'pendente_aprovacao';
              return (
                <div
                  key={u.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm ${
                        u.perfil === 'admin'
                          ? 'bg-indigo-600'
                          : u.perfil === 'ministro_louvor'
                          ? 'bg-purple-600'
                          : 'bg-zinc-800'
                      }`}
                    >
                      {u.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{u.nome}</h4>
                        {u.perfil === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                            <Shield className="w-2.5 h-2.5" /> Administrador Geral
                          </span>
                        ) : u.perfil === 'ministro_louvor' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            <Music2 className="w-2.5 h-2.5" /> Ministro de Louvor
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                            Voluntário
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            u.status === 'ativo'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : u.status === 'pendente_aprovacao'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {u.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{u.email} {u.telefone ? `• ${u.telefone}` : ''}</p>
                      {u.disponibilidade && (
                        <p className="text-[11px] text-zinc-500 italic mt-0.5">Disponibilidade: {u.disponibilidade}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isPendente && (
                      <button
                        onClick={() => handleApproveUser(u)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovar Cadastro</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditUser(u)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeSubTab === 'funcoes' ? (
        /* ROLES MANAGEMENT */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Funções da Equipe</h3>
              <p className="text-xs text-zinc-400">Cadastre e personalize postos operacionais sem alterar código.</p>
            </div>
            <button
              onClick={() => {
                setRoleForm({ nome: '', departamentoId: departamentos[0]?.id || '', cor: '#3B82F6' });
                setRoleModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Função</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {funcoes.map((f) => {
              const dep = departamentos.find((d) => d.id === f.departamentoId);
              return (
                <div
                  key={f.id}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: f.cor }}
                    />
                    <div>
                      <h4 className="font-bold text-xs text-white">{f.nome}</h4>
                      <p className="text-[11px] text-zinc-500">{dep?.nome || 'Geral'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setRoleForm({ id: f.id, nome: f.nome, departamentoId: f.departamentoId, cor: f.cor });
                        setRoleModal(true);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(f.id, f.nome)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeSubTab === 'departamentos' ? (
        /* DEPARTMENTS */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Subequipes & Departamentos</h3>
              <p className="text-xs text-zinc-400">Organize os setores de transmissão, projeção, som e mídias.</p>
            </div>
            <button
              onClick={() => {
                setDeptForm({ nome: '', cor: '#10B981', descricao: '' });
                setDeptModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Departamento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departamentos.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.cor }} />
                    <h4 className="font-bold text-sm text-white">{d.nome}</h4>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{d.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* AUDITORIA / LOGS */
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Registro de Alterações do Sistema (Audit Logs)</span>
          </h3>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-zinc-200">{log.acao}</span>
                  <p className="text-zinc-400 text-xs mt-0.5">{log.detalhes}</p>
                  <span className="text-[10px] text-zinc-500 block mt-1">Autor: {log.usuarioNome}</span>
                </div>
                <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleDateString('pt-BR')} • {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Edit User */}
      {editUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Editar Usuário</h3>
            <p className="text-xs text-zinc-400 mb-4">{selectedUser.email}</p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome Completo *</label>
                <input
                  required
                  type="text"
                  value={userFormData.nome || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Perfil de Acesso</label>
                  <select
                    value={userFormData.perfil}
                    onChange={(e) => setUserFormData({ ...userFormData, perfil: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="voluntario">Voluntário</option>
                    <option value="admin">Administrador Geral</option>
                    <option value="ministro_louvor">Ministro de Louvor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Status da Conta</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pendente_aprovacao">Pendente</option>
                    <option value="inativo">Inativo (Desativado)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={userFormData.telefone || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, telefone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Disponibilidade</label>
                <input
                  type="text"
                  value={userFormData.disponibilidade || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, disponibilidade: e.target.value })}
                  placeholder="Ex: Domingo à noite e quarta-feira"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Role (Função) */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-3">
              {roleForm.id ? 'Editar Função' : 'Cadastrar Função Operacional'}
            </h3>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome da Função *</label>
                <input
                  required
                  type="text"
                  value={roleForm.nome}
                  onChange={(e) => setRoleForm({ ...roleForm, nome: e.target.value })}
                  placeholder="Ex: Câmera Móvel / Gimbal"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Departamento Associado</label>
                <select
                  value={roleForm.departamentoId}
                  onChange={(e) => setRoleForm({ ...roleForm, departamentoId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                >
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Cor Identificadora</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={roleForm.cor}
                    onChange={(e) => setRoleForm({ ...roleForm, cor: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-400 font-mono">{roleForm.cor}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Salvar Função
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Department */}
      {deptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-3">Novo Departamento</h3>

            <form onSubmit={handleSaveDept} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome do Setor *</label>
                <input
                  required
                  type="text"
                  value={deptForm.nome}
                  onChange={(e) => setDeptForm({ ...deptForm, nome: e.target.value })}
                  placeholder="Ex: Cenografia & Telão"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={deptForm.descricao}
                  onChange={(e) => setDeptForm({ ...deptForm, descricao: e.target.value })}
                  placeholder="Responsabilidade da área..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New User (Cadastrar Voluntário / Ministro / Admin) */}
      {newUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Cadastrar Novo Usuário</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Defina o nome, credenciais e cargo de acesso (Administrador Geral, Voluntário ou Ministro de Louvor).
            </p>

            <form onSubmit={handleCreateNewUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome Completo *</label>
                <input
                  required
                  type="text"
                  value={newUserForm.nome}
                  onChange={(e) => setNewUserForm({ ...newUserForm, nome: e.target.value })}
                  placeholder="Ex: David Silva"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">E-mail *</label>
                <input
                  required
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Cargo / Perfil *</label>
                  <select
                    value={newUserForm.perfil}
                    onChange={(e) => setNewUserForm({ ...newUserForm, perfil: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500 font-medium"
                  >
                    <option value="voluntario">Voluntário</option>
                    <option value="ministro_louvor">Ministro de Louvor</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Senha Inicial</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="Padrão: midia123"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={newUserForm.telefone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Disponibilidade</label>
                <input
                  type="text"
                  value={newUserForm.disponibilidade}
                  onChange={(e) => setNewUserForm({ ...newUserForm, disponibilidade: e.target.value })}
                  placeholder="Ex: Domingos à noite, quintas e cultos especiais"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
