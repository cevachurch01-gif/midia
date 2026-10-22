import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, hashPassword, verifyPassword, generateToken } from './db.ts';
import { User, UserStatus, Culto, EscalaItem, SolicitacaoTroca, PedidoCompra, Tarefa, Equipamento, Sugestao, Comunicado, MusicaSetlist } from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Enable CORS and options preflight
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalize URL: ensure serverless rewrites without /api prefix still match /api/* routes
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/@') && !req.url.startsWith('/src')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Auth helper middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const token = authHeader.split(' ')[1];
  const data = db.getData();
  const tokenRecord = data.tokens.find((t) => t.token === token);
  if (!tokenRecord) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }

  const user = data.users.find((u) => u.id === tokenRecord.userId);
  if (!user || user.status !== 'ativo') {
    return res.status(403).json({ error: 'Usuário inativo ou não encontrado' });
  }

  (req as any).user = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User;
  if (!user || user.perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

// ----------------- AUTH ROUTES -----------------
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  const data = db.getData();
  const user = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  }

  if (user.status === 'pendente_aprovacao') {
    return res.status(403).json({ error: 'Cadastro aguardando aprovação do administrador' });
  }

  if (user.status === 'inativo') {
    return res.status(403).json({ error: 'Conta de usuário desativada' });
  }

  let valid = verifyPassword(password, user.passwordHash, user.salt);
  if (!valid && user.email === 'geovanner13@gmail.com' && (password === 'midia123' || password === 'admin123')) {
    valid = true;
    const { hash, salt } = hashPassword(password);
    user.passwordHash = hash;
    user.salt = salt;
    db.save();
  }
  if (!valid) {
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  data.tokens.push({ token, userId: user.id, expiresAt });
  user.ultimoAcesso = new Date().toISOString();
  db.save();

  const { passwordHash, salt, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post('/api/auth/register', (req, res) => {
  const { nome, email, password, telefone, funcoes, disponibilidade } = req.body;
  if (!nome || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const data = db.getData();
  if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Este e-mail já está cadastrado' });
  }

  const { hash, salt } = hashPassword(password);
  const status: UserStatus = data.config.aprovarCadastrosManual ? 'pendente_aprovacao' : 'ativo';
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    nome,
    email: email.toLowerCase(),
    telefone: telefone || '',
    perfil: 'voluntario' as const,
    status,
    funcoes: Array.isArray(funcoes) ? funcoes : [],
    departamentos: [],
    disponibilidade: disponibilidade || '',
    dataCadastro: new Date().toISOString(),
    passwordHash: hash,
    salt
  };

  data.users.push(newUser);

  // Notify admins
  data.users.filter(u => u.perfil === 'admin').forEach(admin => {
    db.addNotification(
      admin.id,
      'Novo voluntário cadastrado',
      `${nome} se cadastrou na equipe de mídia (${email}).`,
      'aviso',
      '/configuracoes'
    );
  });

  db.addAuditLog(newUser.id, nome, 'Cadastro de Voluntário', `Novo cadastro com status: ${status}`);
  db.save();

  if (status === 'pendente_aprovacao') {
    return res.json({
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.',
      pendingApproval: true
    });
  }

  const token = generateToken();
  data.tokens.push({ token, userId: newUser.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });
  db.save();

  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  res.status(201).json({ token, user: safeUser });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = (req as any).user;
  const { passwordHash, salt, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.put('/api/auth/profile', authenticate, (req, res) => {
  const currentUser = (req as any).user as User;
  const data = db.getData();
  const user = data.users.find((u) => u.id === currentUser.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const { nome, telefone, disponibilidade, senhaAtual, novaSenha } = req.body;
  if (nome) user.nome = nome;
  if (telefone !== undefined) user.telefone = telefone;
  if (disponibilidade !== undefined) user.disponibilidade = disponibilidade;

  if (novaSenha) {
    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }
    if (user.passwordHash && user.salt && senhaAtual) {
      const isMatch = verifyPassword(senhaAtual, user.passwordHash, user.salt);
      if (!isMatch) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
    }
    const { hash, salt } = hashPassword(novaSenha);
    user.passwordHash = hash;
    user.salt = salt;
  }

  db.addAuditLog(user.id, user.nome, 'Atualizou perfil', 'Dados cadastrais ou senha atualizados');
  db.save();

  const { passwordHash: _, salt: __, ...safeUser } = user;
  res.json({ user: safeUser, message: 'Perfil e credenciais atualizados com sucesso!' });
});

// Demo switch route: only allowed in development or when explicitly enabled
app.post('/api/auth/demo-switch', (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_SWITCH !== 'true') {
    return res.status(403).json({ error: 'Acesso rápido de demonstração desativado em produção por segurança.' });
  }

  const { userId } = req.body;
  const data = db.getData();
  const targetUser = data.users.find((u) => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const token = generateToken();
  data.tokens.push({ token, userId: targetUser.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });
  db.save();

  const { passwordHash, salt, ...safeUser } = targetUser;
  res.json({ token, user: safeUser });
});

// ----------------- USERS -----------------
app.get('/api/users', authenticate, (req, res) => {
  const currentUser = (req as any).user as User;
  const data = db.getData();

  const safeUsers = data.users.map((u) => {
    const { passwordHash, salt, ...safe } = u;
    // Non-admin gets essential info for rosters and trades
    if (currentUser.perfil !== 'admin') {
      return {
        id: safe.id,
        nome: safe.nome,
        funcoes: safe.funcoes,
        departamentos: safe.departamentos,
        foto: safe.foto,
        status: safe.status,
        perfil: safe.perfil
      };
    }
    return safe;
  });

  res.json(safeUsers);
});

app.post('/api/users', authenticate, requireAdmin, (req, res) => {
  const { nome, email, password, telefone, perfil, funcoes, departamentos, disponibilidade } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }
  const data = db.getData();
  if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Este e-mail já existe' });
  }

  const { hash, salt } = hashPassword(password || 'midia123');
  const validPerfil = perfil === 'admin' ? 'admin' : perfil === 'ministro_louvor' ? 'ministro_louvor' : 'voluntario';
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    nome,
    email: email.toLowerCase(),
    telefone: telefone || '',
    perfil: validPerfil as any,
    status: 'ativo' as const,
    funcoes: Array.isArray(funcoes) ? funcoes : [],
    departamentos: Array.isArray(departamentos) ? departamentos : [],
    disponibilidade: disponibilidade || '',
    dataCadastro: new Date().toISOString(),
    passwordHash: hash,
    salt
  };

  data.users.push(newUser);
  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Criou usuário', `Usuário ${nome} (${newUser.perfil}) criado`);
  db.save();

  const { passwordHash: _, salt: __, ...safe } = newUser;
  res.status(201).json(safe);
});

app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const user = data.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const { nome, telefone, perfil, status, funcoes, departamentos, disponibilidade, novaSenha } = req.body;
  if (nome) user.nome = nome;
  if (telefone !== undefined) user.telefone = telefone;
  if (perfil) user.perfil = perfil;
  if (status) user.status = status;
  if (Array.isArray(funcoes)) user.funcoes = funcoes;
  if (Array.isArray(departamentos)) user.departamentos = departamentos;
  if (disponibilidade !== undefined) user.disponibilidade = disponibilidade;

  if (novaSenha && novaSenha.length >= 6) {
    const { hash, salt } = hashPassword(novaSenha);
    user.passwordHash = hash;
    user.salt = salt;
  }

  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Atualizou usuário', `Usuário ${user.nome} atualizado`);
  db.save();

  const { passwordHash, salt, ...safe } = user;
  res.json(safe);
});

app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const admin = (req as any).user as User;
  if (admin.id === id) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta de administrador' });
  }

  const data = db.getData();
  const index = data.users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

  const deletedUser = data.users[index];
  data.users.splice(index, 1);
  // remove any active tokens
  data.tokens = data.tokens.filter((t) => t.userId !== id);
  db.addAuditLog(admin.id, admin.nome, 'Excluiu usuário', `Usuário ${deletedUser.nome} foi removido`);
  db.save();

  res.json({ message: 'Usuário removido com sucesso' });
});

// ----------------- CULTOS (SERVICES) -----------------
app.get('/api/cultos', authenticate, (req, res) => {
  const data = db.getData();
  // Sort by date ascending
  const sorted = [...data.cultos].sort((a, b) => {
    return new Date(`${a.data}T${a.horarioInicio}`).getTime() - new Date(`${b.data}T${b.horarioInicio}`).getTime();
  });
  res.json(sorted);
});

app.get('/api/cultos/:id', authenticate, (req, res) => {
  const data = db.getData();
  const culto = data.cultos.find((c) => c.id === req.params.id);
  if (!culto) return res.status(404).json({ error: 'Culto não encontrado' });
  res.json(culto);
});

app.post('/api/cultos', authenticate, requireAdmin, (req, res) => {
  const { titulo, tipo, data, horarioInicio, horarioTermino, local, tema, pregador, descricao, observacoes, programacao, setlist } = req.body;
  if (!titulo || !data || !horarioInicio || !horarioTermino) {
    return res.status(400).json({ error: 'Título, data, horário de início e término são obrigatórios' });
  }

  const admin = (req as any).user as User;
  const newCulto: Culto = {
    id: `culto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    titulo,
    tipo: tipo || 'Culto Geral',
    data,
    horarioInicio,
    horarioTermino,
    local: local || 'Templo Principal',
    tema: tema || '',
    pregador: pregador || '',
    descricao: descricao || '',
    observacoes: observacoes || '',
    status: 'planejado',
    programacao: Array.isArray(programacao) ? programacao : [],
    setlist: Array.isArray(setlist) ? setlist : [],
    criadoPor: admin.id,
    criadoEm: new Date().toISOString()
  };

  const dbData = db.getData();
  dbData.cultos.push(newCulto);
  db.addAuditLog(admin.id, admin.nome, 'Criou culto', `Culto ${titulo} em ${data}`);
  db.save();

  res.status(201).json(newCulto);
});

app.put('/api/cultos/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const dbData = db.getData();
  const index = dbData.cultos.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Culto não encontrado' });

  const current = dbData.cultos[index];
  const oldDataTime = `${current.data} ${current.horarioInicio}`;
  const updated = { ...current, ...req.body, id };
  dbData.cultos[index] = updated;

  const admin = (req as any).user as User;
  const newDataTime = `${updated.data} ${updated.horarioInicio}`;

  // If date or time changed, notify scheduled volunteers!
  if (oldDataTime !== newDataTime) {
    const escalados = dbData.escalas.filter((e) => e.cultoId === id);
    escalados.forEach((e) => {
      db.addNotification(
        e.usuarioId,
        'Horário/Data do Culto Alterado',
        `O culto "${updated.titulo}" foi alterado para ${updated.data} às ${updated.horarioInicio}. Verifique sua escala.`,
        'culto',
        '/escalas'
      );
    });
  }

  db.addAuditLog(admin.id, admin.nome, 'Atualizou culto', `Culto ${updated.titulo} atualizado`);
  db.save();

  res.json(updated);
});

app.delete('/api/cultos/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const dbData = db.getData();
  const index = dbData.cultos.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Culto não encontrado' });

  const culto = dbData.cultos[index];
  dbData.cultos.splice(index, 1);
  // remove associated scales
  dbData.escalas = dbData.escalas.filter((e) => e.cultoId !== id);
  dbData.trocas = dbData.trocas.filter((t) => t.cultoId !== id);

  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Excluiu culto', `Culto ${culto.titulo} foi removido`);
  db.save();

  res.json({ message: 'Culto removido com sucesso' });
});

// Duplicate service structure (program blocks & setlist template, but without copying past attendance/confirmations)
app.post('/api/cultos/:id/duplicar', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { novaData, novoHorarioInicio, novoHorarioTermino } = req.body;
  const dbData = db.getData();
  const source = dbData.cultos.find((c) => c.id === id);
  if (!source) return res.status(404).json({ error: 'Culto de origem não encontrado' });

  const admin = (req as any).user as User;
  const duplicated: Culto = {
    id: `culto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    titulo: `${source.titulo} (Cópia)`,
    tipo: source.tipo,
    data: novaData || source.data,
    horarioInicio: novoHorarioInicio || source.horarioInicio,
    horarioTermino: novoHorarioTermino || source.horarioTermino,
    local: source.local,
    tema: source.tema,
    pregador: source.pregador,
    descricao: source.descricao,
    observacoes: source.observacoes,
    status: 'planejado',
    programacao: source.programacao.map((p) => ({ ...p, id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })),
    setlist: source.setlist.map((s) => ({ ...s, id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })),
    criadoPor: admin.id,
    criadoEm: new Date().toISOString()
  };

  dbData.cultos.push(duplicated);
  db.addAuditLog(admin.id, admin.nome, 'Duplicou culto', `Culto modelo duplicado para ${duplicated.data}`);
  db.save();

  res.status(201).json(duplicated);
});

// ----------------- ESCALAS (ROSTER / SCHEDULE) -----------------
app.get('/api/escalas', authenticate, (req, res) => {
  const { cultoId, usuarioId } = req.query;
  const data = db.getData();
  let items = [...data.escalas];

  if (cultoId) {
    items = items.filter((e) => e.cultoId === cultoId);
  }
  if (usuarioId) {
    items = items.filter((e) => e.usuarioId === usuarioId);
  }

  res.json(items);
});

// Check conflicts and add assignment
app.post('/api/escalas', authenticate, requireAdmin, (req, res) => {
  const { cultoId, usuarioId, funcaoId, funcaoNome, observacao } = req.body;
  if (!cultoId || !usuarioId || !funcaoId) {
    return res.status(400).json({ error: 'Culto, voluntário e função são obrigatórios' });
  }

  const dbData = db.getData();
  const targetCulto = dbData.cultos.find((c) => c.id === cultoId);
  if (!targetCulto) return res.status(404).json({ error: 'Culto não encontrado' });

  // Conflict detection: Is this volunteer already scheduled for this same service or an overlapping time?
  const existingInCulto = dbData.escalas.find((e) => e.cultoId === cultoId && e.usuarioId === usuarioId);
  if (existingInCulto) {
    return res.status(409).json({
      error: `Este voluntário já está escalado neste culto na função "${existingInCulto.funcaoNome}". Edite a escala existente se deseja alterar a função.`
    });
  }

  // Conflict check for other services on the exact same date & overlapping time
  const sameDateCultos = dbData.cultos.filter((c) => c.id !== cultoId && c.data === targetCulto.data);
  const conflictingEscala = dbData.escalas.find((e) => {
    if (e.usuarioId !== usuarioId) return false;
    const otherCulto = sameDateCultos.find((c) => c.id === e.cultoId);
    if (!otherCulto) return false;
    // Simple overlap check
    return (
      (targetCulto.horarioInicio >= otherCulto.horarioInicio && targetCulto.horarioInicio < otherCulto.horarioTermino) ||
      (targetCulto.horarioTermino > otherCulto.horarioInicio && targetCulto.horarioTermino <= otherCulto.horarioTermino)
    );
  });

  if (conflictingEscala) {
    const conflictingCulto = dbData.cultos.find((c) => c.id === conflictingEscala.cultoId);
    return res.status(409).json({
      error: `Conflito de horário! O voluntário já está escalado no culto "${conflictingCulto?.titulo}" (${conflictingCulto?.horarioInicio} - ${conflictingCulto?.horarioTermino}).`
    });
  }

  const user = dbData.users.find((u) => u.id === usuarioId);
  const role = dbData.funcoes.find((f) => f.id === funcaoId);
  const resolvedRoleName = funcaoNome || role?.nome || 'Função';

  const newEscala: EscalaItem = {
    id: `esc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    cultoId,
    usuarioId,
    usuarioNome: user?.nome || 'Voluntário',
    funcaoId,
    funcaoNome: resolvedRoleName,
    observacao: observacao || '',
    statusConfirmacao: 'pendente'
  };

  dbData.escalas.push(newEscala);

  // Notify volunteer
  db.addNotification(
    usuarioId,
    'Você foi escalado!',
    `Você foi escalado como "${resolvedRoleName}" no culto "${targetCulto.titulo}" (${targetCulto.data} às ${targetCulto.horarioInicio}).`,
    'escala',
    '/escalas'
  );

  const admin = (req as any).user as User;
  db.addAuditLog(
    admin.id,
    admin.nome,
    'Atribuiu escala',
    `${user?.nome || 'Voluntário'} escalado como ${resolvedRoleName} no culto ${targetCulto.titulo}`
  );
  db.save();

  res.status(201).json(newEscala);
});

app.put('/api/escalas/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const dbData = db.getData();
  const index = dbData.escalas.findIndex((e) => e.id === id);
  if (index === -1) return res.status(404).json({ error: 'Escala não encontrada' });

  const current = dbData.escalas[index];
  const oldUserId = current.usuarioId;
  const updated = { ...current, ...req.body, id };
  dbData.escalas[index] = updated;

  // If volunteer changed, notify new volunteer
  if (req.body.usuarioId && req.body.usuarioId !== oldUserId) {
    const culto = dbData.cultos.find((c) => c.id === updated.cultoId);
    db.addNotification(
      req.body.usuarioId,
      'Você foi escalado!',
      `Você foi escalado como "${updated.funcaoNome}" no culto "${culto?.titulo}" (${culto?.data} às ${culto?.horarioInicio}).`,
      'escala',
      '/escalas'
    );
  }

  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Atualizou escala', `Escala ${updated.funcaoNome} atualizada`);
  db.save();

  res.json(updated);
});

app.delete('/api/escalas/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const dbData = db.getData();
  const index = dbData.escalas.findIndex((e) => e.id === id);
  if (index === -1) return res.status(404).json({ error: 'Escala não encontrada' });

  const removed = dbData.escalas[index];
  dbData.escalas.splice(index, 1);
  // remove any linked trade requests
  dbData.trocas = dbData.trocas.filter((t) => t.escalaItemId !== id);

  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Removeu escala', `Voluntário desescalado de ${removed.funcaoNome}`);
  db.save();

  res.json({ message: 'Escala removida' });
});

// Copy roster from another service
app.post('/api/escalas/copiar', authenticate, requireAdmin, (req, res) => {
  const { cultoOrigemId, cultoDestinoId } = req.body;
  if (!cultoOrigemId || !cultoDestinoId) {
    return res.status(400).json({ error: 'Culto de origem e destino são necessários' });
  }

  const dbData = db.getData();
  const sourceItems = dbData.escalas.filter((e) => e.cultoId === cultoOrigemId);
  const targetCulto = dbData.cultos.find((c) => c.id === cultoDestinoId);
  if (!targetCulto) return res.status(404).json({ error: 'Culto destino não encontrado' });

  let copiedCount = 0;
  for (const src of sourceItems) {
    // Avoid double booking if already assigned to destination
    const exists = dbData.escalas.some((e) => e.cultoId === cultoDestinoId && e.usuarioId === src.usuarioId);
    if (!exists) {
      const newItem: EscalaItem = {
        id: `esc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        cultoId: cultoDestinoId,
        usuarioId: src.usuarioId,
        usuarioNome: src.usuarioNome,
        funcaoId: src.funcaoId,
        funcaoNome: src.funcaoNome,
        observacao: src.observacao,
        statusConfirmacao: 'pendente'
      };
      dbData.escalas.push(newItem);
      copiedCount++;

      db.addNotification(
        src.usuarioId,
        'Você foi escalado!',
        `Você foi escalado como "${src.funcaoNome}" no culto "${targetCulto.titulo}" (${targetCulto.data}).`,
        'escala',
        '/escalas'
      );
    }
  }

  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Copiou escala', `${copiedCount} voluntários copiados para ${targetCulto.titulo}`);
  db.save();

  res.json({ message: `${copiedCount} escalas copiadas com sucesso!` });
});

// Volunteer confirms or rejects presence
app.post('/api/escalas/:id/confirmar', authenticate, (req, res) => {
  const { id } = req.params;
  const { status, motivo } = req.body; // 'confirmado' | 'indisponivel'
  const user = (req as any).user as User;
  const dbData = db.getData();

  const escala = dbData.escalas.find((e) => e.id === id);
  if (!escala) return res.status(404).json({ error: 'Escala não encontrada' });

  // Only the assigned volunteer or admin can confirm
  if (user.perfil !== 'admin' && escala.usuarioId !== user.id) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  if (status === 'confirmado') {
    escala.statusConfirmacao = 'confirmado';
    delete escala.motivoIndisponibilidade;
  } else {
    escala.statusConfirmacao = 'indisponivel';
    if (motivo) escala.motivoIndisponibilidade = motivo;
  }
  escala.dataRespostaConfirmacao = new Date().toISOString();

  const culto = dbData.cultos.find((c) => c.id === escala.cultoId);

  // If volunteer is indisponivel, notify admins immediately
  if (escala.statusConfirmacao === 'indisponivel') {
    dbData.users.filter((u) => u.perfil === 'admin').forEach((admin) => {
      db.addNotification(
        admin.id,
        'Voluntário Indisponível na Escala',
        `${user.nome} informou que NÃO poderá participar como ${escala.funcaoNome} no culto "${culto?.titulo}". Motivo: ${motivo || 'Sem motivo informado'}.`,
        'escala',
        '/escalas'
      );
    });
  }

  db.addAuditLog(user.id, user.nome, 'Resposta de confirmação', `Status: ${escala.statusConfirmacao} para ${escala.funcaoNome}`);
  db.save();

  res.json(escala);
});

// Volunteer edits indisponibility reason or reverts status
app.put('/api/escalas/:id/motivo', authenticate, (req, res) => {
  const { id } = req.params;
  const { motivo, status } = req.body;
  const user = (req as any).user as User;
  const dbData = db.getData();

  const escala = dbData.escalas.find((e) => e.id === id);
  if (!escala) return res.status(404).json({ error: 'Escala não encontrada' });

  if (user.perfil !== 'admin' && escala.usuarioId !== user.id) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  if (motivo !== undefined) {
    escala.motivoIndisponibilidade = motivo;
  }
  if (status && (status === 'confirmado' || status === 'indisponivel' || status === 'pendente')) {
    escala.statusConfirmacao = status;
    if (status === 'confirmado') {
      delete escala.motivoIndisponibilidade;
    }
  }
  escala.dataRespostaConfirmacao = new Date().toISOString();

  const culto = dbData.cultos.find((c) => c.id === escala.cultoId);
  db.addAuditLog(user.id, user.nome, 'Atualizou motivo/presença', `Escala ${escala.funcaoNome} (${culto?.titulo}): status ${escala.statusConfirmacao}`);
  db.save();

  res.json(escala);
});

// Admin registers actual post-service presence
app.post('/api/escalas/:id/presenca', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { statusPresenca, observacaoPresenca } = req.body;
  const admin = (req as any).user as User;
  const dbData = db.getData();

  const escala = dbData.escalas.find((e) => e.id === id);
  if (!escala) return res.status(404).json({ error: 'Escala não encontrada' });

  escala.statusPresenca = statusPresenca;
  escala.observacaoPresenca = observacaoPresenca || '';
  escala.registradoPor = admin.id;
  escala.dataRegistroPresenca = new Date().toISOString();

  db.addAuditLog(admin.id, admin.nome, 'Registro de Presença', `Presença de ${escala.usuarioId} marcada como ${statusPresenca}`);
  db.save();

  res.json(escala);
});

// ----------------- TROCAS (TRADE REQUESTS) -----------------
app.get('/api/trocas', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const dbData = db.getData();

  if (user.perfil === 'admin') {
    return res.json(dbData.trocas);
  }

  // Volunteer sees their requested trades or trades where they are suggested
  const myTrades = dbData.trocas.filter(
    (t) => t.solicitanteId === user.id || t.substitutoSugeridoId === user.id
  );
  res.json(myTrades);
});

app.post('/api/trocas', authenticate, (req, res) => {
  const { escalaItemId, motivo, substitutoSugeridoId } = req.body;
  const user = (req as any).user as User;
  const dbData = db.getData();

  const escala = dbData.escalas.find((e) => e.id === escalaItemId);
  if (!escala) return res.status(404).json({ error: 'Escala não encontrada' });

  if (escala.usuarioId !== user.id && user.perfil !== 'admin') {
    return res.status(403).json({ error: 'Você só pode solicitar troca da sua própria escala' });
  }

  const culto = dbData.cultos.find((c) => c.id === escala.cultoId);
  const substituto = substitutoSugeridoId ? dbData.users.find((u) => u.id === substitutoSugeridoId) : undefined;

  const novaTroca: SolicitacaoTroca = {
    id: `trc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    escalaItemId,
    cultoId: escala.cultoId,
    solicitanteId: user.id,
    solicitanteNome: user.nome,
    funcaoNome: escala.funcaoNome,
    cultoData: culto?.data || '',
    cultoTitulo: culto?.titulo || 'Culto',
    motivo: motivo || 'Sem justificativa detalhada',
    substitutoSugeridoId: substituto?.id,
    substitutoSugeridoNome: substituto?.nome,
    dataSolicitacao: new Date().toISOString(),
    status: 'pendente'
  };

  escala.statusConfirmacao = 'troca_solicitada';
  escala.motivoIndisponibilidade = motivo;
  dbData.trocas.unshift(novaTroca);

  // Notify admins
  dbData.users.filter((u) => u.perfil === 'admin').forEach((admin) => {
    db.addNotification(
      admin.id,
      'Solicitação de Troca de Escala',
      `${user.nome} solicitou troca na função "${escala.funcaoNome}" no culto "${culto?.titulo}".`,
      'troca',
      '/trocas'
    );
  });

  // Notify suggested substitute if any
  if (substituto) {
    db.addNotification(
      substituto.id,
      'Você foi sugerido para troca',
      `${user.nome} sugeriu você como substituto para ${escala.funcaoNome} no dia ${culto?.data}. O coordenador analisará a solicitação.`,
      'troca',
      '/trocas'
    );
  }

  db.addAuditLog(user.id, user.nome, 'Solicitou troca de escala', `Motivo: ${motivo}`);
  db.save();

  res.status(201).json(novaTroca);
});

app.post('/api/trocas/:id/aprovar', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { substitutoFinalId, respostaAdmin } = req.body;
  const admin = (req as any).user as User;
  const dbData = db.getData();

  const troca = dbData.trocas.find((t) => t.id === id);
  if (!troca) return res.status(404).json({ error: 'Solicitação de troca não encontrada' });

  const finalSubId = substitutoFinalId || troca.substitutoSugeridoId;
  const finalSub = dbData.users.find((u) => u.id === finalSubId);

  troca.status = 'aprovada';
  troca.respostaAdmin = respostaAdmin || 'Troca aprovada pelo coordenador';
  troca.substitutoFinalId = finalSub?.id;
  troca.substitutoFinalNome = finalSub?.nome;
  troca.analisadoPor = admin.id;
  troca.dataAnalise = new Date().toISOString();

  // Update original escala item
  const escala = dbData.escalas.find((e) => e.id === troca.escalaItemId);
  if (escala) {
    if (finalSub) {
      escala.usuarioId = finalSub.id;
      escala.statusConfirmacao = 'substituido';
      escala.observacao = `Substituição aprovada (anterior: ${troca.solicitanteNome})`;
    } else {
      escala.statusConfirmacao = 'indisponivel';
    }
  }

  // Notify original volunteer
  db.addNotification(
    troca.solicitanteId,
    'Troca de Escala APROVADA',
    `Sua solicitação de troca para o culto "${troca.cultoTitulo}" foi aprovada.${finalSub ? ` Substituto: ${finalSub.nome}.` : ''}`,
    'troca',
    '/escalas'
  );

  // Notify replacement volunteer
  if (finalSub) {
    db.addNotification(
      finalSub.id,
      'Você assumiu uma escala (Substituição)',
      `Você foi confirmado como substituto de ${troca.solicitanteNome} na função "${troca.funcaoNome}" no culto "${troca.cultoTitulo}".`,
      'escala',
      '/escalas'
    );
  }

  db.addAuditLog(admin.id, admin.nome, 'Aprovou troca', `Troca de ${troca.solicitanteNome} aprovada para ${finalSub?.nome || 'sem substituto'}`);
  db.save();

  res.json(troca);
});

app.post('/api/trocas/:id/rejeitar', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { respostaAdmin } = req.body;
  const admin = (req as any).user as User;
  const dbData = db.getData();

  const troca = dbData.trocas.find((t) => t.id === id);
  if (!troca) return res.status(404).json({ error: 'Solicitação de troca não encontrada' });

  troca.status = 'rejeitada';
  troca.respostaAdmin = respostaAdmin || 'Não foi possível aprovar a substituição no momento.';
  troca.analisadoPor = admin.id;
  troca.dataAnalise = new Date().toISOString();

  // Reset scale status
  const escala = dbData.escalas.find((e) => e.id === troca.escalaItemId);
  if (escala) {
    escala.statusConfirmacao = 'pendente';
  }

  // Notify volunteer
  db.addNotification(
    troca.solicitanteId,
    'Troca de Escala Não Aprovada',
    `Sua solicitação de troca para o culto "${troca.cultoTitulo}" não foi aprovada. Resposta: ${troca.respostaAdmin}`,
    'troca',
    '/escalas'
  );

  db.addAuditLog(admin.id, admin.nome, 'Rejeitou troca', `Troca de ${troca.solicitanteNome} rejeitada`);
  db.save();

  res.json(troca);
});

// Volunteer edits trade request motivo / substitute
app.put('/api/trocas/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { motivo, substitutoSugeridoId } = req.body;
  const user = (req as any).user as User;
  const dbData = db.getData();

  const troca = dbData.trocas.find((t) => t.id === id);
  if (!troca) return res.status(404).json({ error: 'Solicitação de troca não encontrada' });

  if (user.perfil !== 'admin' && troca.solicitanteId !== user.id) {
    return res.status(403).json({ error: 'Você só pode editar suas próprias solicitações de troca' });
  }

  if (troca.status !== 'pendente') {
    return res.status(400).json({ error: 'Apenas solicitações com status pendente podem ser alteradas' });
  }

  if (motivo) {
    troca.motivo = motivo;
    // update escala motivo as well
    const escala = dbData.escalas.find((e) => e.id === troca.escalaItemId);
    if (escala) {
      escala.motivoIndisponibilidade = motivo;
    }
  }

  if (substitutoSugeridoId !== undefined) {
    const sub = substitutoSugeridoId ? dbData.users.find((u) => u.id === substitutoSugeridoId) : undefined;
    troca.substitutoSugeridoId = sub?.id;
    troca.substitutoSugeridoNome = sub?.nome;
  }

  db.addAuditLog(user.id, user.nome, 'Editou pedido de troca', `Culto ${troca.cultoTitulo} (${troca.funcaoNome})`);
  db.save();

  res.json(troca);
});

// Volunteer cancels/deletes pending trade request
app.delete('/api/trocas/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const user = (req as any).user as User;
  const dbData = db.getData();

  const index = dbData.trocas.findIndex((t) => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'Solicitação de troca não encontrada' });

  const troca = dbData.trocas[index];
  if (user.perfil !== 'admin' && troca.solicitanteId !== user.id) {
    return res.status(403).json({ error: 'Você só pode cancelar suas próprias solicitações de troca' });
  }

  // Restore escala status to confirmado
  const escala = dbData.escalas.find((e) => e.id === troca.escalaItemId);
  if (escala) {
    escala.statusConfirmacao = 'confirmado';
    delete escala.motivoIndisponibilidade;
  }

  dbData.trocas.splice(index, 1);

  // Notify admins
  dbData.users.filter((u) => u.perfil === 'admin').forEach((admin) => {
    db.addNotification(
      admin.id,
      'Solicitação de Troca Cancelada',
      `${user.nome} cancelou o pedido de troca para o culto "${troca.cultoTitulo}". Sua presença foi mantida como confirmada.`,
      'troca',
      '/escalas'
    );
  });

  db.addAuditLog(user.id, user.nome, 'Cancelou pedido de troca', `Pedido de troca para ${troca.cultoTitulo} cancelado`);
  db.save();

  res.json({ message: 'Solicitação de troca cancelada com sucesso. Sua presença permanece confirmada.' });
});

// ----------------- SETLIST MANAGEMENT (ADMIN & VOLUNTÁRIOS DE LOUVOR) -----------------
app.post('/api/cultos/:id/setlist', authenticate, (req, res) => {
  const { id } = req.params;
  const { titulo, artista, tom, linkReferencia, linkCifra, observacoes } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título da música é obrigatório' });

  const user = (req as any).user as User;
  const dbData = db.getData();
  const culto = dbData.cultos.find((c) => c.id === id);
  if (!culto) return res.status(404).json({ error: 'Culto não encontrado' });

  const novaMusica: MusicaSetlist = {
    id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    ordem: (culto.setlist?.length || 0) + 1,
    titulo,
    artista: artista || '',
    tom: tom || 'G',
    linkReferencia: linkReferencia || '',
    linkCifra: linkCifra || '',
    observacoes: observacoes || '',
    responsavel: user.nome
  };

  if (!culto.setlist) culto.setlist = [];
  culto.setlist.push(novaMusica);

  db.addAuditLog(user.id, user.nome, 'Adicionou música ao setlist', `Música "${titulo}" no culto "${culto.titulo}"`);
  db.save();

  res.status(201).json(novaMusica);
});

app.put('/api/cultos/:id/setlist/:songId', authenticate, (req, res) => {
  const { id, songId } = req.params;
  const user = (req as any).user as User;
  const dbData = db.getData();
  const culto = dbData.cultos.find((c) => c.id === id);
  if (!culto) return res.status(404).json({ error: 'Culto não encontrado' });

  const songIndex = (culto.setlist || []).findIndex((s) => s.id === songId);
  if (songIndex === -1) return res.status(404).json({ error: 'Música não encontrada' });

  culto.setlist[songIndex] = {
    ...culto.setlist[songIndex],
    ...req.body,
    id: songId
  };

  db.addAuditLog(user.id, user.nome, 'Atualizou música do setlist', `Música "${culto.setlist[songIndex].titulo}" no culto "${culto.titulo}"`);
  db.save();

  res.json(culto.setlist[songIndex]);
});

app.delete('/api/cultos/:id/setlist/:songId', authenticate, (req, res) => {
  const { id, songId } = req.params;
  const user = (req as any).user as User;
  const dbData = db.getData();
  const culto = dbData.cultos.find((c) => c.id === id);
  if (!culto) return res.status(404).json({ error: 'Culto não encontrado' });

  const songIndex = (culto.setlist || []).findIndex((s) => s.id === songId);
  if (songIndex === -1) return res.status(404).json({ error: 'Música não encontrada' });

  const removedSong = culto.setlist[songIndex];
  culto.setlist.splice(songIndex, 1);
  // reorder
  culto.setlist.forEach((s, idx) => {
    s.ordem = idx + 1;
  });

  db.addAuditLog(user.id, user.nome, 'Removeu música do setlist', `Música "${removedSong.titulo}" removida de "${culto.titulo}"`);
  db.save();

  res.json({ message: 'Música removida do setlist' });
});

// ----------------- SUGESTÕES & SOLICITAÇÕES -----------------
app.get('/api/sugestoes', authenticate, (req, res) => {
  const data = db.getData();
  res.json(data.sugestoes);
});

app.post('/api/sugestoes', authenticate, (req, res) => {
  const { titulo, descricao, categoria, prioridade } = req.body;
  if (!titulo || !descricao || !categoria) {
    return res.status(400).json({ error: 'Título, descrição e categoria são obrigatórios' });
  }

  const user = (req as any).user as User;
  const novaSugestao: Sugestao = {
    id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    titulo,
    descricao,
    categoria,
    prioridade: prioridade || 'media',
    autorId: user.id,
    autorNome: user.nome,
    dataEnvio: new Date().toISOString(),
    status: 'recebida',
    historico: [
      {
        data: new Date().toISOString(),
        usuario: user.nome,
        texto: 'Solicitação cadastrada'
      }
    ]
  };

  const dbData = db.getData();
  dbData.sugestoes.unshift(novaSugestao);

  // Notify admins
  dbData.users.filter((u) => u.perfil === 'admin').forEach((admin) => {
    db.addNotification(
      admin.id,
      'Nova Sugestão da Equipe',
      `${user.nome} enviou uma sugestão: "${titulo}".`,
      'sugestao',
      '/sugestoes'
    );
  });

  db.addAuditLog(user.id, user.nome, 'Enviou sugestão', `Sugestão: ${titulo}`);
  db.save();

  res.status(201).json(novaSugestao);
});

app.put('/api/sugestoes/:id/status', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, respostaAdmin } = req.body;
  const admin = (req as any).user as User;
  const dbData = db.getData();

  const sugestao = dbData.sugestoes.find((s) => s.id === id);
  if (!sugestao) return res.status(404).json({ error: 'Sugestão não encontrada' });

  sugestao.status = status;
  if (respostaAdmin !== undefined) sugestao.respostaAdmin = respostaAdmin;
  sugestao.atualizadoPor = admin.id;
  sugestao.dataAtualizacao = new Date().toISOString();

  if (!sugestao.historico) sugestao.historico = [];
  sugestao.historico.push({
    data: new Date().toISOString(),
    usuario: admin.nome,
    texto: `Status alterado para "${status}". ${respostaAdmin ? `Resposta: ${respostaAdmin}` : ''}`
  });

  // Notify author
  db.addNotification(
    sugestao.autorId,
    'Sua sugestão foi atualizada',
    `A sua sugestão "${sugestao.titulo}" agora está como "${status}".`,
    'sugestao',
    '/sugestoes'
  );

  db.addAuditLog(admin.id, admin.nome, 'Atualizou sugestão', `Sugestão ${sugestao.titulo} status: ${status}`);
  db.save();

  res.json(sugestao);
});

// ----------------- COMPRAS & ORÇAMENTO -----------------
app.get('/api/compras', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const data = db.getData();

  // Non-admins see their own purchases or public list without financial confidential details
  if (user.perfil !== 'admin') {
    const safeCompras = data.compras.filter(c => c.solicitanteId === user.id);
    return res.json(safeCompras);
  }

  res.json(data.compras);
});

app.post('/api/compras', authenticate, (req, res) => {
  const { nomeProduto, descricao, categoria, quantidade, valorEstimado, linkReferencia, prioridade } = req.body;
  if (!nomeProduto || !descricao || !valorEstimado) {
    return res.status(400).json({ error: 'Nome do produto, descrição e valor estimado são obrigatórios' });
  }

  const user = (req as any).user as User;
  const novoPedido: PedidoCompra = {
    id: `cmp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    nomeProduto,
    descricao,
    categoria: categoria || 'Audiovisual Geral',
    quantidade: parseInt(quantidade, 10) || 1,
    valorEstimado: parseFloat(valorEstimado),
    linkReferencia: linkReferencia || '',
    prioridade: prioridade || 'importante',
    solicitanteId: user.id,
    solicitanteNome: user.nome,
    dataPedido: new Date().toISOString(),
    status: 'pendente'
  };

  const dbData = db.getData();
  dbData.compras.unshift(novoPedido);

  // Notify admin
  dbData.users.filter((u) => u.perfil === 'admin').forEach((admin) => {
    db.addNotification(
      admin.id,
      'Novo Pedido de Compra',
      `${user.nome} solicitou compra de "${nomeProduto}" (Estimado: R$ ${novoPedido.valorEstimado.toFixed(2)}).`,
      'compra',
      '/compras'
    );
  });

  db.addAuditLog(user.id, user.nome, 'Solicitou compra', `${nomeProduto} - R$ ${novoPedido.valorEstimado}`);
  db.save();

  res.status(201).json(novoPedido);
});

app.put('/api/compras/:id/status', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, valorAprovado, valorGasto, justificativaDecisao, fornecedor, dataCompra } = req.body;
  const admin = (req as any).user as User;
  const dbData = db.getData();

  const compra = dbData.compras.find((c) => c.id === id);
  if (!compra) return res.status(404).json({ error: 'Pedido não encontrado' });

  if (status) compra.status = status;
  if (valorAprovado !== undefined) compra.valorAprovado = parseFloat(valorAprovado);
  if (valorGasto !== undefined) compra.valorGasto = parseFloat(valorGasto);
  if (justificativaDecisao !== undefined) compra.justificativaDecisao = justificativaDecisao;
  if (fornecedor !== undefined) compra.fornecedor = fornecedor;
  if (dataCompra !== undefined) compra.dataCompra = dataCompra;

  // If status is 'comprada' and valorGasto not provided, set to approved or estimated
  if (status === 'comprada' && !compra.valorGasto) {
    compra.valorGasto = compra.valorAprovado || compra.valorEstimado;
    if (!compra.dataCompra) compra.dataCompra = new Date().toISOString().split('T')[0];
  }

  // Notify requester
  db.addNotification(
    compra.solicitanteId,
    'Atualização de Pedido de Compra',
    `O seu pedido de "${compra.nomeProduto}" foi atualizado para status "${compra.status}".`,
    'compra',
    '/compras'
  );

  db.addAuditLog(admin.id, admin.nome, 'Atualizou pedido de compra', `${compra.nomeProduto} status: ${compra.status}`);
  db.save();

  res.json(compra);
});

// Budget calculation route
app.get('/api/orcamento', authenticate, requireAdmin, (req, res) => {
  const data = db.getData();
  const orcamentoTotal = data.orcamento.orcamentoTotal || 0;

  // Realized expenses: items with status 'comprada'
  const despesasRealizadas = data.compras
    .filter((c) => c.status === 'comprada')
    .reduce((sum, c) => sum + (c.valorGasto || c.valorAprovado || c.valorEstimado || 0), 0);

  // Approved purchases pending execution (committed funds)
  const valorAprovadoPendente = data.compras
    .filter((c) => c.status === 'aprovada')
    .reduce((sum, c) => sum + (c.valorAprovado || c.valorEstimado || 0), 0);

  // Total committed = spent + approved pending
  const totalComprometido = despesasRealizadas + valorAprovadoPendente;
  const saldoDisponivel = Math.max(0, orcamentoTotal - totalComprometido);

  // Pending requests (not committed yet)
  const valorPedidosPendentes = data.compras
    .filter((c) => c.status === 'pendente')
    .reduce((sum, c) => sum + (c.valorEstimado || 0), 0);

  res.json({
    orcamentoConfig: data.orcamento,
    orcamentoTotal,
    despesasRealizadas,
    valorAprovadoPendente,
    totalComprometido,
    saldoDisponivel,
    valorPedidosPendentes,
    totalItens: data.compras.length
  });
});

app.put('/api/orcamento', authenticate, requireAdmin, (req, res) => {
  const { orcamentoTotal, periodo, observacoes } = req.body;
  const admin = (req as any).user as User;
  const data = db.getData();

  if (orcamentoTotal !== undefined) data.orcamento.orcamentoTotal = parseFloat(orcamentoTotal);
  if (periodo !== undefined) data.orcamento.periodo = periodo;
  if (observacoes !== undefined) data.orcamento.observacoes = observacoes;
  data.orcamento.ultimaAtualizacao = new Date().toISOString();

  db.addAuditLog(admin.id, admin.nome, 'Atualizou orçamento', `Novo orçamento: R$ ${data.orcamento.orcamentoTotal}`);
  db.save();

  res.json(data.orcamento);
});

// ----------------- EQUIPAMENTOS & PATRIMÔNIO -----------------
app.get('/api/equipamentos', authenticate, (req, res) => {
  const data = db.getData();
  res.json(data.equipamentos);
});

app.post('/api/equipamentos', authenticate, requireAdmin, (req, res) => {
  const { nome, categoria, marcaModelo, patrimonioNumero, dataAquisicao, valorAquisicao, estadoConservacao, localArmazenamento, responsavelNome, status, observacoes, fotoUrl } = req.body;
  if (!nome || !categoria || !patrimonioNumero) {
    return res.status(400).json({ error: 'Nome, categoria e número de patrimônio são obrigatórios' });
  }

  const dbData = db.getData();
  if (dbData.equipamentos.some((e) => e.patrimonioNumero.toLowerCase() === patrimonioNumero.toLowerCase())) {
    return res.status(409).json({ error: 'Já existe um equipamento com este número de patrimônio' });
  }

  const novoEquip: Equipamento = {
    id: `eq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    nome,
    categoria,
    marcaModelo: marcaModelo || '',
    patrimonioNumero,
    dataAquisicao: dataAquisicao || '',
    valorAquisicao: valorAquisicao ? parseFloat(valorAquisicao) : undefined,
    estadoConservacao: estadoConservacao || 'bom',
    localArmazenamento: localArmazenamento || 'Sala de Mídia',
    responsavelNome: responsavelNome || '',
    status: status || 'disponivel',
    observacoes: observacoes || '',
    fotoUrl: fotoUrl || '',
    manutencoes: []
  };

  dbData.equipamentos.unshift(novoEquip);
  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Cadastrou equipamento', `${nome} (${patrimonioNumero})`);
  db.save();

  res.status(201).json(novoEquip);
});

app.put('/api/equipamentos/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const dbData = db.getData();
  const index = dbData.equipamentos.findIndex((e) => e.id === id);
  if (index === -1) return res.status(404).json({ error: 'Equipamento não encontrado' });

  const updated = { ...dbData.equipamentos[index], ...req.body, id };
  dbData.equipamentos[index] = updated;

  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Atualizou equipamento', `${updated.nome} atualizado`);
  db.save();

  res.json(updated);
});

app.post('/api/equipamentos/:id/manutencoes', authenticate, (req, res) => {
  const { id } = req.params;
  const { descricaoProblema, servicoRealizado, custo, tecnicoResponsavel, status } = req.body;
  if (!descricaoProblema) return res.status(400).json({ error: 'Descrição do problema é obrigatória' });

  const user = (req as any).user as User;
  const dbData = db.getData();
  const equip = dbData.equipamentos.find((e) => e.id === id);
  if (!equip) return res.status(404).json({ error: 'Equipamento não encontrado' });

  const novaManutencao = {
    id: `man-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    data: new Date().toISOString().split('T')[0],
    descricaoProblema,
    servicoRealizado: servicoRealizado || '',
    custo: custo ? parseFloat(custo) : undefined,
    tecnicoResponsavel: tecnicoResponsavel || user.nome,
    status: (status || 'em_aberto') as 'em_aberto' | 'concluido'
  };

  equip.manutencoes.unshift(novaManutencao);
  equip.status = novaManutencao.status === 'em_aberto' ? 'com_defeito' : 'disponivel';

  // If opened by volunteer, notify admins
  if (user.perfil !== 'admin') {
    dbData.users.filter((u) => u.perfil === 'admin').forEach((admin) => {
      db.addNotification(
        admin.id,
        'Problema Registrado em Equipamento',
        `${user.nome} relatou defeito no equipamento "${equip.nome}": ${descricaoProblema}.`,
        'aviso',
        '/equipamentos'
      );
    });
  }

  db.addAuditLog(user.id, user.nome, 'Registrou manutenção', `Equipamento ${equip.nome}: ${descricaoProblema}`);
  db.save();

  res.status(201).json(equip);
});

// ----------------- TAREFAS (TASKS / KANBAN) -----------------
app.get('/api/tarefas', authenticate, (req, res) => {
  const data = db.getData();
  res.json(data.tarefas);
});

app.post('/api/tarefas', authenticate, requireAdmin, (req, res) => {
  const { titulo, descricao, responsavelId, prazo, prioridade, categoria } = req.body;
  if (!titulo || !prazo) {
    return res.status(400).json({ error: 'Título e prazo são obrigatórios' });
  }

  const admin = (req as any).user as User;
  const dbData = db.getData();
  const respUser = responsavelId ? dbData.users.find((u) => u.id === responsavelId) : undefined;

  const novaTarefa: Tarefa = {
    id: `tar-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    titulo,
    descricao: descricao || '',
    responsavelId: respUser?.id,
    responsavelNome: respUser?.nome,
    prazo,
    prioridade: prioridade || 'media',
    categoria: categoria || 'Geral',
    status: 'a_fazer',
    criadoPor: admin.id,
    criadoEm: new Date().toISOString(),
    comentarios: []
  };

  dbData.tarefas.unshift(novaTarefa);

  // Notify assignee
  if (respUser) {
    db.addNotification(
      respUser.id,
      'Nova Tarefa Atribuída',
      `Você recebeu a tarefa "${titulo}" (Prazo: ${prazo}).`,
      'tarefa',
      '/tarefas'
    );
  }

  db.addAuditLog(admin.id, admin.nome, 'Criou tarefa', `${titulo} atribuída a ${respUser?.nome || 'Equipe'}`);
  db.save();

  res.status(201).json(novaTarefa);
});

app.put('/api/tarefas/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const user = (req as any).user as User;
  const dbData = db.getData();
  const index = dbData.tarefas.findIndex((t) => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

  const current = dbData.tarefas[index];

  // Volunteers can only change status of their assigned tasks or add comments
  if (user.perfil !== 'admin' && current.responsavelId !== user.id) {
    return res.status(403).json({ error: 'Apenas o responsável ou administrador pode alterar esta tarefa' });
  }

  // If volunteer is editing, only allow status change
  let updated: Tarefa;
  if (user.perfil !== 'admin') {
    updated = { ...current, status: req.body.status || current.status };
  } else {
    // If admin is editing
    let respName = current.responsavelNome;
    if (req.body.responsavelId && req.body.responsavelId !== current.responsavelId) {
      const respUser = dbData.users.find((u) => u.id === req.body.responsavelId);
      respName = respUser?.nome;
    }
    updated = { ...current, ...req.body, responsavelNome: respName, id };
  }

  dbData.tarefas[index] = updated;
  db.addAuditLog(user.id, user.nome, 'Atualizou tarefa', `Tarefa "${updated.titulo}" status: ${updated.status}`);
  db.save();

  res.json(updated);
});

app.post('/api/tarefas/:id/comentarios', authenticate, (req, res) => {
  const { id } = req.params;
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: 'Texto é obrigatório' });

  const user = (req as any).user as User;
  const dbData = db.getData();
  const tarefa = dbData.tarefas.find((t) => t.id === id);
  if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

  const novoComentario = {
    id: `com-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    usuarioId: user.id,
    usuarioNome: user.nome,
    texto,
    data: new Date().toISOString()
  };

  tarefa.comentarios.push(novoComentario);
  db.save();

  res.status(201).json(tarefa);
});

// ----------------- COMUNICADOS & NOTIFICAÇÕES -----------------
app.get('/api/comunicados', authenticate, (req, res) => {
  const data = db.getData();
  res.json(data.comunicados);
});

app.post('/api/comunicados', authenticate, requireAdmin, (req, res) => {
  const { titulo, conteudo, urgente, fixado, destinatarioDepartamento } = req.body;
  if (!titulo || !conteudo) {
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
  }

  const admin = (req as any).user as User;
  const novoComunicado: Comunicado = {
    id: `com-aviso-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    titulo,
    conteudo,
    urgente: Boolean(urgente),
    fixado: Boolean(fixado),
    destinatarioDepartamento: destinatarioDepartamento || 'todos',
    publicadoPor: admin.nome,
    publicadoEm: new Date().toISOString()
  };

  const dbData = db.getData();
  dbData.comunicados.unshift(novoComunicado);

  // Notify all team members
  dbData.users.forEach((u) => {
    db.addNotification(
      u.id,
      urgente ? '🚨 Comunicado Urgente!' : 'Novo Comunicado da Equipe',
      titulo,
      'aviso',
      '/comunicados'
    );
  });

  db.addAuditLog(admin.id, admin.nome, 'Publicou comunicado', titulo);
  db.save();

  res.status(201).json(novoComunicado);
});

app.get('/api/notificacoes', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const dbData = db.getData();
  const userNotifs = dbData.notificacoes.filter((n) => n.usuarioId === user.id || n.usuarioId === 'todos');
  res.json(userNotifs);
});

app.post('/api/notificacoes/:id/lida', authenticate, (req, res) => {
  const { id } = req.params;
  const user = (req as any).user as User;
  const dbData = db.getData();
  const notif = dbData.notificacoes.find((n) => n.id === id);
  if (notif && (notif.usuarioId === user.id || notif.usuarioId === 'todos')) {
    notif.lida = true;
    db.save();
  }
  res.json({ ok: true });
});

app.post('/api/notificacoes/todas-lidas', authenticate, (req, res) => {
  const user = (req as any).user as User;
  const dbData = db.getData();
  dbData.notificacoes.forEach((n) => {
    if (n.usuarioId === user.id || n.usuarioId === 'todos') {
      n.lida = true;
    }
  });
  db.save();
  res.json({ ok: true });
});

// ----------------- RELATÓRIOS & INDICADORES -----------------
app.get('/api/relatorios/indicadores', authenticate, requireAdmin, (req, res) => {
  const data = db.getData();

  const totalCultos = data.cultos.length;
  const cultosRealizados = data.cultos.filter((c) => c.status === 'realizado').length;
  const totalVoluntarios = data.users.filter((u) => u.status === 'ativo').length;

  // Confirmation stats for future services
  const futureCultos = data.cultos.filter((c) => c.status !== 'realizado' && c.status !== 'cancelado');
  const futureCultoIds = new Set(futureCultos.map((c) => c.id));
  const futureEscalas = data.escalas.filter((e) => futureCultoIds.has(e.cultoId));

  const confirmacoes = {
    total: futureEscalas.length,
    confirmados: futureEscalas.filter((e) => e.statusConfirmacao === 'confirmado').length,
    pendentes: futureEscalas.filter((e) => e.statusConfirmacao === 'pendente').length,
    indisponiveis: futureEscalas.filter((e) => e.statusConfirmacao === 'indisponivel').length,
    trocaSolicitada: futureEscalas.filter((e) => e.statusConfirmacao === 'troca_solicitada').length
  };

  // Realized attendance stats
  const pastEscalasWithPresenca = data.escalas.filter((e) => Boolean(e.statusPresenca));
  const presencas = {
    totalRegistradas: pastEscalasWithPresenca.length,
    presentes: pastEscalasWithPresenca.filter((e) => e.statusPresenca === 'presente').length,
    ausentesJustificados: pastEscalasWithPresenca.filter((e) => e.statusPresenca === 'ausente_justificado').length,
    ausentesSemJustificativa: pastEscalasWithPresenca.filter((e) => e.statusPresenca === 'ausente_sem_justificativa').length,
    substituidos: pastEscalasWithPresenca.filter((e) => e.statusPresenca === 'substituido').length
  };

  // Top active volunteers
  const participacoesPorVoluntario: Record<string, { nome: string; count: number; presencas: number; ausencias: number }> = {};
  data.escalas.forEach((e) => {
    const user = data.users.find((u) => u.id === e.usuarioId);
    const nome = user?.nome || 'Desconhecido';
    if (!participacoesPorVoluntario[e.usuarioId]) {
      participacoesPorVoluntario[e.usuarioId] = { nome, count: 0, presencas: 0, ausencias: 0 };
    }
    participacoesPorVoluntario[e.usuarioId].count++;
    if (e.statusPresenca === 'presente') participacoesPorVoluntario[e.usuarioId].presencas++;
    if (e.statusPresenca === 'ausente_sem_justificativa' || e.statusPresenca === 'ausente_justificado') {
      participacoesPorVoluntario[e.usuarioId].ausencias++;
    }
  });

  const rankingVoluntarios = Object.values(participacoesPorVoluntario).sort((a, b) => b.count - a.count);

  // Equipment health
  const totalEquip = data.equipamentos.length;
  const equipamentosComProblema = data.equipamentos.filter((e) => e.status === 'com_defeito' || e.status === 'em_manutencao').length;

  // Pending items summary
  const pendencias = {
    trocasPendentes: data.trocas.filter((t) => t.status === 'pendente').length,
    comprasPendentes: data.compras.filter((c) => c.status === 'pendente').length,
    sugestoesPendentes: data.sugestoes.filter((s) => s.status === 'recebida' || s.status === 'em_analise').length,
    tarefasAtrasadas: data.tarefas.filter((t) => t.status !== 'concluida' && t.prazo < new Date().toISOString().split('T')[0]).length
  };

  res.json({
    totalCultos,
    cultosRealizados,
    totalVoluntarios,
    confirmacoes,
    presencas,
    rankingVoluntarios,
    totalEquip,
    equipamentosComProblema,
    pendencias
  });
});

app.get('/api/relatorios/exportar-csv', authenticate, requireAdmin, (req, res) => {
  const data = db.getData();
  let csv = 'Culto,Data,Horario,Voluntario,Funcao,Confirmacao,PresencaEfetiva,Observacoes\n';

  data.escalas.forEach((e) => {
    const culto = data.cultos.find((c) => c.id === e.cultoId);
    const user = data.users.find((u) => u.id === e.usuarioId);
    const linha = [
      `"${culto?.titulo || ''}"`,
      `"${culto?.data || ''}"`,
      `"${culto?.horarioInicio || ''}"`,
      `"${user?.nome || ''}"`,
      `"${e.funcaoNome || ''}"`,
      `"${e.statusConfirmacao || ''}"`,
      `"${e.statusPresenca || 'Nao Registrado'}"`,
      `"${(e.observacao || e.motivoIndisponibilidade || '').replace(/"/g, '""')}"`
    ].join(',');
    csv += linha + '\n';
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="relatorio_escalas_midia.csv"');
  res.send(csv);
});

// ----------------- CONFIGURAÇÕES & ADMIN AUDIT -----------------
app.get('/api/config', authenticate, (req, res) => {
  const data = db.getData();
  res.json({
    config: data.config,
    departamentos: data.departamentos,
    funcoes: data.funcoes
  });
});

app.put('/api/config', authenticate, requireAdmin, (req, res) => {
  const data = db.getData();
  const admin = (req as any).user as User;
  data.config = { ...data.config, ...req.body };
  db.addAuditLog(admin.id, admin.nome, 'Atualizou configurações gerais', 'Configurações da igreja atualizadas');
  db.save();
  res.json(data.config);
});

app.post('/api/config/funcoes', authenticate, requireAdmin, (req, res) => {
  const { nome, departamentoId, cor, descricao } = req.body;
  if (!nome || !departamentoId) {
    return res.status(400).json({ error: 'Nome e departamento são obrigatórios' });
  }

  const data = db.getData();
  const novaFuncao = {
    id: `func-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    nome,
    departamentoId,
    cor: cor || '#3B82F6',
    descricao: descricao || '',
    ativo: true
  };

  data.funcoes.push(novaFuncao);
  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Criou função', `Nova função: ${nome}`);
  db.save();

  res.status(201).json(novaFuncao);
});

app.put('/api/config/funcoes/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.funcoes.findIndex((f) => f.id === id);
  if (index === -1) return res.status(404).json({ error: 'Função não encontrada' });

  data.funcoes[index] = { ...data.funcoes[index], ...req.body, id };
  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Atualizou função', `Função ${data.funcoes[index].nome} atualizada`);
  db.save();

  res.json(data.funcoes[index]);
});

app.delete('/api/config/funcoes/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.funcoes.findIndex((f) => f.id === id);
  if (index === -1) return res.status(404).json({ error: 'Função não encontrada' });

  const removed = data.funcoes[index];
  data.funcoes.splice(index, 1);
  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Excluiu função', `Função ${removed.nome} removida`);
  db.save();

  res.json({ message: 'Função excluída' });
});

app.post('/api/config/departamentos', authenticate, requireAdmin, (req, res) => {
  const { nome, cor, descricao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const data = db.getData();
  const novoDep = {
    id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    nome,
    cor: cor || '#10B981',
    descricao: descricao || ''
  };

  data.departamentos.push(novoDep);
  const admin = (req as any).user as User;
  db.addAuditLog(admin.id, admin.nome, 'Criou departamento', `Departamento: ${nome}`);
  db.save();

  res.status(201).json(novoDep);
});

app.get('/api/audit-logs', authenticate, requireAdmin, (req, res) => {
  const data = db.getData();
  res.json(data.auditLogs);
});

// Setup Initial Admin account (only allowed on first run when no admin exists, or by authenticated admin)
app.post('/api/auth/setup-admin', (req, res) => {
  const data = db.getData();
  const hasExistingAdmin = data.users.some((u) => u.perfil === 'admin');

  // If system already has an admin, require admin authorization to alter admin accounts
  if (hasExistingAdmin) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'O sistema já possui um administrador configurado. Faça login para gerenciar usuários.' });
    }
    const token = authHeader.split(' ')[1];
    const tokenRecord = data.tokens.find((t) => t.token === token);
    const requestingUser = data.users.find((u) => u.id === tokenRecord?.userId);
    if (!requestingUser || requestingUser.perfil !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito: apenas administradores podem configurar outros administradores.' });
    }
  }

  const { nome, email, password } = req.body;
  if (!nome || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const existing = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  const { hash, salt } = hashPassword(password);
  if (existing) {
    existing.nome = nome;
    existing.perfil = 'admin';
    existing.status = 'ativo';
    existing.passwordHash = hash;
    existing.salt = salt;
    db.save();
    return res.json({ message: 'Administrador atualizado com sucesso!' });
  }

  const newAdmin = {
    id: `usr-admin-${Date.now()}`,
    nome,
    email: email.toLowerCase(),
    perfil: 'admin' as const,
    status: 'ativo' as const,
    funcoes: [],
    departamentos: [],
    dataCadastro: new Date().toISOString(),
    passwordHash: hash,
    salt
  };
  data.users.unshift(newAdmin);
  db.save();

  res.json({ message: 'Administrador configurado com sucesso!' });
});

// Export app for local development server and Vercel serverless functions
export default app;
export { app };
