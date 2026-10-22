export type UserRole = 'admin' | 'voluntario' | 'ministro_louvor';
export type UserStatus = 'ativo' | 'pendente_aprovacao' | 'inativo';

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  foto?: string;
  perfil: UserRole;
  status: UserStatus;
  funcoes: string[]; // Role IDs or names
  departamentos: string[];
  disponibilidade?: string;
  dataCadastro: string;
  ultimoAcesso?: string;
}

export interface FuncaoEquipe {
  id: string;
  nome: string;
  descricao?: string;
  departamentoId: string;
  cor: string;
  ativo: boolean;
}

export interface Departamento {
  id: string;
  nome: string;
  descricao?: string;
  cor: string;
  liderId?: string;
}

export type CultoStatus = 'planejado' | 'confirmado' | 'realizado' | 'cancelado';

export interface BlocoProgramacao {
  id: string;
  ordem: number;
  titulo: string; // Ex: Abertura, Louvor, Ofertas, Pregação, Apelo, etc.
  duracaoMinutos?: number;
  responsavel?: string;
  observacoes?: string;
}

export interface MusicaSetlist {
  id: string;
  ordem: number;
  titulo: string;
  artista: string;
  tom: string;
  linkReferencia?: string; // YouTube, Spotify
  linkCifra?: string;
  observacoes?: string;
  responsavel?: string;
}

export interface Culto {
  id: string;
  titulo: string;
  tipo: string; // Domingo Manhã, Domingo Noite, Quarta, Jovens, Especial, etc.
  data: string; // YYYY-MM-DD
  horarioInicio: string; // HH:mm
  horarioTermino: string; // HH:mm
  local: string;
  tema?: string;
  pregador?: string;
  descricao?: string;
  observacoes?: string;
  status: CultoStatus;
  programacao: BlocoProgramacao[];
  setlist: MusicaSetlist[];
  criadoPor: string;
  criadoEm: string;
}

export type ConfirmacaoStatus =
  | 'pendente'
  | 'confirmado'
  | 'indisponivel'
  | 'troca_solicitada'
  | 'substituido';

export type PresencaStatus =
  | 'presente'
  | 'ausente_justificado'
  | 'ausente_sem_justificativa'
  | 'substituido'
  | 'nao_se_aplica';

export interface EscalaItem {
  id: string;
  cultoId: string;
  usuarioId: string;
  usuarioNome?: string;
  funcaoId: string;
  funcaoNome: string;
  observacao?: string;
  statusConfirmacao: ConfirmacaoStatus;
  dataRespostaConfirmacao?: string;
  motivoIndisponibilidade?: string;
  // Post-service actual attendance
  statusPresenca?: PresencaStatus;
  observacaoPresenca?: string;
  registradoPor?: string;
  dataRegistroPresenca?: string;
}

export type TrocaStatus = 'pendente' | 'aprovada' | 'rejeitada' | 'concluida';

export interface SolicitacaoTroca {
  id: string;
  escalaItemId: string;
  cultoId: string;
  solicitanteId: string;
  solicitanteNome: string;
  funcaoNome: string;
  cultoData: string;
  cultoTitulo: string;
  motivo: string;
  substitutoSugeridoId?: string;
  substitutoSugeridoNome?: string;
  substitutoFinalId?: string;
  substitutoFinalNome?: string;
  dataSolicitacao: string;
  status: TrocaStatus;
  respostaAdmin?: string;
  analisadoPor?: string;
  dataAnalise?: string;
}

export type SugestaoCategoria =
  | 'sugestao_compra'
  | 'melhoria_equipamento'
  | 'problema_tecnico'
  | 'melhoria_processo'
  | 'ideia_video_conteudo'
  | 'sugestao_transmissao'
  | 'espaco_fisico'
  | 'treinamento'
  | 'outras';

export type SugestaoStatus =
  | 'recebida'
  | 'em_analise'
  | 'aprovada'
  | 'em_andamento'
  | 'concluida'
  | 'rejeitada'
  | 'adiada';

export interface Sugestao {
  id: string;
  titulo: string;
  descricao: string;
  categoria: SugestaoCategoria;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  autorId: string;
  autorNome: string;
  dataEnvio: string;
  status: SugestaoStatus;
  respostaAdmin?: string;
  atualizadoPor?: string;
  dataAtualizacao?: string;
  historico?: { data: string; usuario: string; texto: string }[];
}

export type CompraPrioridade = 'essencial' | 'importante' | 'desejavel';
export type CompraStatus = 'pendente' | 'aprovada' | 'rejeitada' | 'comprada' | 'cancelada';

export interface PedidoCompra {
  id: string;
  nomeProduto: string;
  descricao: string;
  categoria: string;
  quantidade: number;
  valorEstimado: number;
  valorAprovado?: number;
  valorGasto?: number;
  linkReferencia?: string;
  prioridade: CompraPrioridade;
  solicitanteId: string;
  solicitanteNome: string;
  dataPedido: string;
  status: CompraStatus;
  justificativaDecisao?: string;
  fornecedor?: string;
  dataCompra?: string;
  comprovanteRef?: string;
  observacoes?: string;
}

export interface OrcamentoConfig {
  orcamentoTotal: number;
  periodo: string; // Ex: "Ano 2026" ou "Mensal"
  observacoes?: string;
  ultimaAtualizacao: string;
}

export type EquipamentoStatus =
  | 'em_uso'
  | 'disponivel'
  | 'em_manutencao'
  | 'com_defeito'
  | 'emprestado'
  | 'descartado';

export interface ManutencaoRegistro {
  id: string;
  data: string;
  descricaoProblema: string;
  servicoRealizado?: string;
  custo?: number;
  tecnicoResponsavel?: string;
  status: 'em_aberto' | 'concluido';
  dataConclusao?: string;
}

export interface Equipamento {
  id: string;
  nome: string;
  categoria: string;
  marcaModelo: string;
  patrimonioNumero: string;
  dataAquisicao?: string;
  valorAquisicao?: number;
  estadoConservacao: 'novo' | 'bom' | 'regular' | 'precario';
  localArmazenamento: string;
  responsavelNome?: string;
  status: EquipamentoStatus;
  observacoes?: string;
  fotoUrl?: string;
  manutencoes: ManutencaoRegistro[];
}

export type TarefaStatus = 'a_fazer' | 'em_andamento' | 'aguardando' | 'concluida';
export type TarefaPrioridade = 'baixa' | 'media' | 'alta' | 'urgente';

export interface TarefaComentario {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  texto: string;
  data: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  responsavelId?: string;
  responsavelNome?: string;
  prazo: string; // YYYY-MM-DD
  prioridade: TarefaPrioridade;
  categoria: string;
  status: TarefaStatus;
  criadoPor: string;
  criadoEm: string;
  comentarios: TarefaComentario[];
}

export interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  urgente: boolean;
  publicadoPor: string;
  publicadoEm: string;
  destinatarioDepartamento?: string; // 'todos' ou ID
  fixado: boolean;
}

export interface Notificacao {
  id: string;
  usuarioId: string; // 'todos' ou ID específico
  titulo: string;
  mensagem: string;
  tipo: 'escala' | 'culto' | 'troca' | 'tarefa' | 'sugestao' | 'compra' | 'aviso';
  link?: string;
  lida: boolean;
  criadaEm: string;
}

export interface ConfiguracaoIgreja {
  nomeIgreja: string;
  nomeAplicativo: string;
  slogan?: string;
  logoUrl?: string;
  corDestaque: string; // hex color e.g. #3B82F6 or #6366F1
  temaPadrao: 'dark' | 'light';
  permiteCadastroPublico: boolean;
  aprovarCadastrosManual: boolean;
  permitirTrocaComSugestao: boolean;
}

export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  acao: string;
  detalhes: string;
  timestamp: string;
}
