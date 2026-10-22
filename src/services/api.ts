import {
  User,
  Culto,
  EscalaItem,
  SolicitacaoTroca,
  Sugestao,
  PedidoCompra,
  OrcamentoConfig,
  Equipamento,
  Tarefa,
  Comunicado,
  Notificacao,
  ConfiguracaoIgreja,
  FuncaoEquipe,
  Departamento,
  AuditLog
} from '../types';

const TOKEN_KEY = 'midia_central_token';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeStoredToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = 'Ocorreu um erro na requisição';
    try {
      const errorData = await response.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  register: (data: { nome: string; email: string; password: string; telefone?: string; funcoes?: string[]; disponibilidade?: string }) =>
    request<{ token?: string; user?: User; message?: string; pendingApproval?: boolean }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getMe: () => request<{ user: User }>('/api/auth/me'),
  updateProfile: (data: {
    nome?: string;
    telefone?: string;
    disponibilidade?: string;
    senhaAtual?: string;
    novaSenha?: string;
  }) =>
    request<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  demoSwitch: (userId: string) =>
    request<{ token: string; user: User }>('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),
  setupAdmin: (data: { nome: string; email: string; password: string }) =>
    request<{ message: string }>('/api/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Users
  getUsers: () => request<User[]>('/api/users'),
  createUser: (data: Partial<User> & { password?: string }) =>
    request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateUser: (id: string, data: Partial<User> & { novaSenha?: string }) =>
    request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteUser: (id: string) =>
    request<{ message: string }>(`/api/users/${id}`, {
      method: 'DELETE'
    }),

  // Cultos
  getCultos: () => request<Culto[]>('/api/cultos'),
  getCulto: (id: string) => request<Culto>(`/api/cultos/${id}`),
  createCulto: (data: Partial<Culto>) =>
    request<Culto>('/api/cultos', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCulto: (id: string, data: Partial<Culto>) =>
    request<Culto>(`/api/cultos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteCulto: (id: string) =>
    request<{ message: string }>(`/api/cultos/${id}`, {
      method: 'DELETE'
    }),
  duplicarCulto: (id: string, data: { novaData?: string; novoHorarioInicio?: string; novoHorarioTermino?: string }) =>
    request<Culto>(`/api/cultos/${id}/duplicar`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Escalas
  getEscalas: (params?: { cultoId?: string; usuarioId?: string }) => {
    const q = new URLSearchParams();
    if (params?.cultoId) q.append('cultoId', params.cultoId);
    if (params?.usuarioId) q.append('usuarioId', params.usuarioId);
    return request<EscalaItem[]>(`/api/escalas${q.toString() ? `?${q.toString()}` : ''}`);
  },
  createEscala: (data: { cultoId: string; usuarioId: string; funcaoId: string; funcaoNome?: string; observacao?: string }) =>
    request<EscalaItem>('/api/escalas', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateEscala: (id: string, data: Partial<EscalaItem>) =>
    request<EscalaItem>(`/api/escalas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteEscala: (id: string) =>
    request<{ message: string }>(`/api/escalas/${id}`, {
      method: 'DELETE'
    }),
  copiarEscala: (cultoOrigemId: string, cultoDestinoId: string) =>
    request<{ message: string }>('/api/escalas/copiar', {
      method: 'POST',
      body: JSON.stringify({ cultoOrigemId, cultoDestinoId })
    }),
  confirmarEscala: (id: string, status: 'confirmado' | 'indisponivel', motivo?: string) =>
    request<EscalaItem>(`/api/escalas/${id}/confirmar`, {
      method: 'POST',
      body: JSON.stringify({ status, motivo })
    }),
  editarMotivoEscala: (id: string, data: { motivo?: string; status?: 'confirmado' | 'indisponivel' | 'pendente' }) =>
    request<EscalaItem>(`/api/escalas/${id}/motivo`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  registrarPresenca: (id: string, statusPresenca: EscalaItem['statusPresenca'], observacaoPresenca?: string) =>
    request<EscalaItem>(`/api/escalas/${id}/presenca`, {
      method: 'POST',
      body: JSON.stringify({ statusPresenca, observacaoPresenca })
    }),

  // Trocas
  getTrocas: () => request<SolicitacaoTroca[]>('/api/trocas'),
  solicitarTroca: (data: { escalaItemId: string; motivo: string; substitutoSugeridoId?: string }) =>
    request<SolicitacaoTroca>('/api/trocas', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  editarTroca: (id: string, data: { motivo?: string; substitutoSugeridoId?: string }) =>
    request<SolicitacaoTroca>(`/api/trocas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  cancelarTroca: (id: string) =>
    request<{ message: string }>(`/api/trocas/${id}`, {
      method: 'DELETE'
    }),
  aprovarTroca: (id: string, data: { substitutoFinalId?: string; respostaAdmin?: string }) =>
    request<SolicitacaoTroca>(`/api/trocas/${id}/aprovar`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  rejeitarTroca: (id: string, respostaAdmin: string) =>
    request<SolicitacaoTroca>(`/api/trocas/${id}/rejeitar`, {
      method: 'POST',
      body: JSON.stringify({ respostaAdmin })
    }),

  // Setlist directly
  addSongToSetlist: (cultoId: string, songData: { titulo: string; artista?: string; tom?: string; linkReferencia?: string; linkCifra?: string; observacoes?: string; responsavel?: string }) =>
    request<any>(`/api/cultos/${cultoId}/setlist`, {
      method: 'POST',
      body: JSON.stringify(songData)
    }),
  updateSongInSetlist: (cultoId: string, songId: string, songData: any) =>
    request<any>(`/api/cultos/${cultoId}/setlist/${songId}`, {
      method: 'PUT',
      body: JSON.stringify(songData)
    }),
  deleteSongFromSetlist: (cultoId: string, songId: string) =>
    request<{ message: string }>(`/api/cultos/${cultoId}/setlist/${songId}`, {
      method: 'DELETE'
    }),

  // Sugestões
  getSugestoes: () => request<Sugestao[]>('/api/sugestoes'),
  createSugestao: (data: Partial<Sugestao>) =>
    request<Sugestao>('/api/sugestoes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateSugestaoStatus: (id: string, data: { status: Sugestao['status']; respostaAdmin?: string }) =>
    request<Sugestao>(`/api/sugestoes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Compras & Orçamento
  getCompras: () => request<PedidoCompra[]>('/api/compras'),
  createCompra: (data: Partial<PedidoCompra>) =>
    request<PedidoCompra>('/api/compras', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCompraStatus: (id: string, data: Partial<PedidoCompra>) =>
    request<PedidoCompra>(`/api/compras/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  getOrcamento: () =>
    request<{
      orcamentoConfig: OrcamentoConfig;
      orcamentoTotal: number;
      despesasRealizadas: number;
      valorAprovadoPendente: number;
      totalComprometido: number;
      saldoDisponivel: number;
      valorPedidosPendentes: number;
      totalItens: number;
    }>('/api/orcamento'),
  updateOrcamento: (data: Partial<OrcamentoConfig>) =>
    request<OrcamentoConfig>('/api/orcamento', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Equipamentos
  getEquipamentos: () => request<Equipamento[]>('/api/equipamentos'),
  createEquipamento: (data: Partial<Equipamento>) =>
    request<Equipamento>('/api/equipamentos', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateEquipamento: (id: string, data: Partial<Equipamento>) =>
    request<Equipamento>(`/api/equipamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  addManutencao: (id: string, data: { descricaoProblema: string; servicoRealizado?: string; custo?: number; tecnicoResponsavel?: string; status?: 'em_aberto' | 'concluido' }) =>
    request<Equipamento>(`/api/equipamentos/${id}/manutencoes`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Tarefas
  getTarefas: () => request<Tarefa[]>('/api/tarefas'),
  createTarefa: (data: Partial<Tarefa>) =>
    request<Tarefa>('/api/tarefas', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateTarefa: (id: string, data: Partial<Tarefa>) =>
    request<Tarefa>(`/api/tarefas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  addComentarioTarefa: (id: string, texto: string) =>
    request<Tarefa>(`/api/tarefas/${id}/comentarios`, {
      method: 'POST',
      body: JSON.stringify({ texto })
    }),

  // Comunicados
  getComunicados: () => request<Comunicado[]>('/api/comunicados'),
  createComunicado: (data: Partial<Comunicado>) =>
    request<Comunicado>('/api/comunicados', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Notificações
  getNotificacoes: () => request<Notificacao[]>('/api/notificacoes'),
  markNotificacaoLida: (id: string) => request<{ ok: boolean }>(`/api/notificacoes/${id}/lida`, { method: 'POST' }),
  markTodasLidas: () => request<{ ok: boolean }>('/api/notificacoes/todas-lidas', { method: 'POST' }),

  // Relatórios
  getIndicadores: () =>
    request<{
      totalCultos: number;
      cultosRealizados: number;
      totalVoluntarios: number;
      confirmacoes: { total: number; confirmados: number; pendentes: number; indisponiveis: number; trocaSolicitada: number };
      presencas: { totalRegistradas: number; presentes: number; ausentesJustificados: number; ausentesSemJustificativa: number; substituidos: number };
      rankingVoluntarios: { nome: string; count: number; presencas: number; ausencias: number }[];
      totalEquip: number;
      equipamentosComProblema: number;
      pendencias: { trocasPendentes: number; comprasPendentes: number; sugestoesPendentes: number; tarefasAtrasadas: number };
    }>('/api/relatorios/indicadores'),

  // Configurações & Equipe
  getConfig: () =>
    request<{
      config: ConfiguracaoIgreja;
      departamentos: Departamento[];
      funcoes: FuncaoEquipe[];
    }>('/api/config'),
  updateConfig: (data: Partial<ConfiguracaoIgreja>) =>
    request<ConfiguracaoIgreja>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  createFuncao: (data: Partial<FuncaoEquipe>) =>
    request<FuncaoEquipe>('/api/config/funcoes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateFuncao: (id: string, data: Partial<FuncaoEquipe>) =>
    request<FuncaoEquipe>(`/api/config/funcoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteFuncao: (id: string) =>
    request<{ message: string }>(`/api/config/funcoes/${id}`, {
      method: 'DELETE'
    }),
  createDepartamento: (data: Partial<Departamento>) =>
    request<Departamento>('/api/config/departamentos', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs')
};
