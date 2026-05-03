const SCHEMA_SQL = `
-- ═══════════════════════════════════════════════════
-- USUÁRIOS E AUTH
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'operador' CHECK(perfil IN ('admin', 'operador')),
  ativo INTEGER NOT NULL DEFAULT 1,
  ultimo_acesso TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  expira_em TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ═══════════════════════════════════════════════════
-- CLIENTES E LEADS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'PF' CHECK(tipo IN ('PF', 'PJ')),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  rg TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT DEFAULT 'Ibiporã',
  estado TEXT DEFAULT 'PR',
  observacoes TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  origem TEXT DEFAULT 'manual' CHECK(origem IN ('whatsapp', 'indicacao', 'instagram', 'google', 'manual', 'outro')),
  etapa TEXT NOT NULL DEFAULT 'novo' CHECK(etapa IN ('novo', 'em_atendimento', 'proposta', 'negociacao', 'fechado', 'perdido')),
  servico_interesse TEXT,
  veiculo_placa TEXT,
  veiculo_modelo TEXT,
  valor_estimado REAL,
  motivo_perda TEXT,
  cliente_id TEXT,
  responsavel_id TEXT,
  posicao_kanban INTEGER DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS lead_interacoes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  usuario_id TEXT,
  tipo TEXT NOT NULL CHECK(tipo IN ('nota', 'ligacao', 'whatsapp', 'email', 'reuniao', 'sistema')),
  descricao TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS lembretes (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  cliente_id TEXT,
  usuario_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TEXT NOT NULL,
  concluido INTEGER DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ═══════════════════════════════════════════════════
-- PROCESSOS / SERVIÇOS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS servicos_catalogo (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_padrao REAL,
  codigo_servico_nf TEXT,
  ativo INTEGER DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS processos (
  id TEXT PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  cliente_id TEXT NOT NULL,
  servico_id TEXT,
  veiculo_placa TEXT,
  veiculo_renavam TEXT,
  veiculo_chassi TEXT,
  veiculo_modelo TEXT,
  veiculo_ano INTEGER,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK(status IN ('aberto', 'em_andamento', 'concluido', 'cancelado')),
  descricao TEXT,
  valor REAL,
  responsavel_id TEXT,
  lead_id TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (servico_id) REFERENCES servicos_catalogo(id),
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- ═══════════════════════════════════════════════════
-- DOCUMENTOS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS documentos (
  id TEXT PRIMARY KEY,
  processo_id TEXT,
  cliente_id TEXT,
  tipo TEXT NOT NULL CHECK(tipo IN ('cnh', 'crlv', 'comprovante_endereco', 'identidade', 'procuracao', 'contrato', 'outro')),
  nome_original TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  caminho TEXT NOT NULL,
  tamanho INTEGER,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'aprovado', 'rejeitado')),
  observacao TEXT,
  enviado_por TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (processo_id) REFERENCES processos(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (enviado_por) REFERENCES usuarios(id)
);

-- ═══════════════════════════════════════════════════
-- FINANCEIRO
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lancamentos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  data_vencimento TEXT NOT NULL,
  data_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'pago', 'cancelado', 'atrasado')),
  forma_pagamento TEXT CHECK(forma_pagamento IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'boleto', 'transferencia')),
  cliente_id TEXT,
  processo_id TEXT,
  nota_fiscal_id TEXT,
  observacoes TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (processo_id) REFERENCES processos(id)
);

-- ═══════════════════════════════════════════════════
-- CAIXA
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS caixas (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  data_abertura TEXT NOT NULL,
  data_fechamento TEXT,
  valor_inicial REAL NOT NULL DEFAULT 0,
  valor_final REAL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK(status IN ('aberto', 'fechado')),
  observacoes TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS caixa_movimentos (
  id TEXT PRIMARY KEY,
  caixa_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  forma_pagamento TEXT,
  lancamento_id TEXT,
  usuario_id TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (caixa_id) REFERENCES caixas(id),
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ═══════════════════════════════════════════════════
-- NOTAS FISCAIS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id TEXT PRIMARY KEY,
  numero TEXT UNIQUE,
  processo_id TEXT,
  cliente_id TEXT NOT NULL,
  servico_id TEXT,
  descricao_servico TEXT NOT NULL,
  valor_servico REAL NOT NULL,
  aliquota_iss REAL DEFAULT 5.0,
  valor_iss REAL,
  valor_liquido REAL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'emitida', 'cancelada', 'erro')),
  codigo_verificacao TEXT,
  xml_path TEXT,
  pdf_path TEXT,
  retorno_api TEXT,
  emitida_em TEXT,
  cancelada_em TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (processo_id) REFERENCES processos(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (servico_id) REFERENCES servicos_catalogo(id)
);

-- ═══════════════════════════════════════════════════
-- WHATSAPP
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT,
  mensagem TEXT NOT NULL,
  variaveis TEXT,
  ativo INTEGER DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whatsapp_conversas (
  id TEXT PRIMARY KEY,
  contato_numero TEXT NOT NULL,
  contato_nome TEXT,
  lead_id TEXT,
  cliente_id TEXT,
  ultima_mensagem TEXT,
  ultima_mensagem_em TEXT,
  nao_lidas INTEGER DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id TEXT PRIMARY KEY,
  conversa_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('enviada', 'recebida')),
  conteudo TEXT NOT NULL,
  status TEXT DEFAULT 'enviada',
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversa_id) REFERENCES whatsapp_conversas(id)
);

-- ═══════════════════════════════════════════════════
-- LOGS E NOTIFICAÇÕES
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS logs_sistema (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nivel TEXT NOT NULL CHECK(nivel IN ('info', 'warn', 'error')),
  modulo TEXT,
  mensagem TEXT NOT NULL,
  dados TEXT,
  usuario_id TEXT,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida INTEGER DEFAULT 0,
  dados TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ═══════════════════════════════════════════════════
-- ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_leads_etapa ON leads(etapa);
CREATE INDEX IF NOT EXISTS idx_leads_cliente ON leads(cliente_id);
CREATE INDEX IF NOT EXISTS idx_processos_cliente ON processos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_processos_status ON processos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_vencimento ON lancamentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_documentos_processo ON documentos(processo_id);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentos_caixa ON caixa_movimentos(caixa_id);
CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs_sistema(criado_em);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
`;

module.exports = { SCHEMA_SQL };
