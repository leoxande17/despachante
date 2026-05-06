// src/main/services/crm.js
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('./database');
const LogService = require('./log');

const CRMService = {
  db() { return DatabaseService.getDB(); },

  normalizeSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w]/g, '')
      .toLowerCase();
  },

  // ─── LEADS ────────────────────────────────────────────
  getLeads(filters = {}) {
    let sql = `
      SELECT l.*, u.nome as responsavel_nome
      FROM leads l
      LEFT JOIN usuarios u ON l.responsavel_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.etapa) { sql += ' AND l.etapa = ?'; params.push(filters.etapa); }
    if (filters.origem) { sql += ' AND l.origem = ?'; params.push(filters.origem); }
    if (filters.responsavel_id) { sql += ' AND l.responsavel_id = ?'; params.push(filters.responsavel_id); }

    sql += ' ORDER BY l.posicao_kanban ASC, l.criado_em DESC';

    const leads = this.db().prepare(sql).all(...params);
    return { success: true, data: leads };
  },

  createLead(data) {
    const id = uuidv4();
    const maxPos = this.db().prepare(
      'SELECT MAX(posicao_kanban) as m FROM leads WHERE etapa = ?'
    ).get(data.etapa || 'novo')?.m || 0;

    this.db().prepare(`
      INSERT INTO leads (id, nome, telefone, whatsapp, email, origem, etapa,
        servico_interesse, veiculo_placa, veiculo_modelo, valor_estimado,
        responsavel_id, posicao_kanban)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.nome, data.telefone, data.whatsapp, data.email,
      data.origem || 'manual', data.etapa || 'novo',
      data.servico_interesse, data.veiculo_placa, data.veiculo_modelo,
      data.valor_estimado, data.responsavel_id, maxPos + 1
    );

    this._addInteracaoSistema(id, 'Lead criado no sistema');
    LogService.info('Lead criado', { id, nome: data.nome });
    return { success: true, id };
  },

  updateLead(data) {
    this.db().prepare(`
      UPDATE leads SET nome=?, telefone=?, whatsapp=?, email=?, origem=?,
        servico_interesse=?, veiculo_placa=?, veiculo_modelo=?,
        valor_estimado=?, responsavel_id=?, motivo_perda=?,
        atualizado_em=datetime('now')
      WHERE id=?
    `).run(
      data.nome, data.telefone, data.whatsapp, data.email, data.origem,
      data.servico_interesse, data.veiculo_placa, data.veiculo_modelo,
      data.valor_estimado, data.responsavel_id, data.motivo_perda, data.id
    );
    return { success: true };
  },

  moveLead({ id, etapa, posicao }) {
    const old = this.db().prepare('SELECT etapa FROM leads WHERE id=?').get(id);
    
    this.db().prepare(`
      UPDATE leads SET etapa=?, posicao_kanban=?, atualizado_em=datetime('now') WHERE id=?
    `).run(etapa, posicao || 0, id);

    if (old?.etapa !== etapa) {
      const etapasLabel = {
        novo: 'Novo', em_atendimento: 'Em Atendimento', proposta: 'Proposta',
        negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido'
      };
      this._addInteracaoSistema(id, `Lead movido para: ${etapasLabel[etapa] || etapa}`);
    }
    return { success: true };
  },

  deleteLead(id) {
    this.db().prepare('DELETE FROM lead_interacoes WHERE lead_id=?').run(id);
    this.db().prepare('DELETE FROM leads WHERE id=?').run(id);
    return { success: true };
  },

  getLeadHistory(id) {
    const interactions = this.db().prepare(`
      SELECT i.*, u.nome as usuario_nome
      FROM lead_interacoes i
      LEFT JOIN usuarios u ON i.usuario_id = u.id
      WHERE i.lead_id = ?
      ORDER BY i.criado_em DESC
    `).all(id);
    return { success: true, data: interactions };
  },

  addInteraction({ lead_id, tipo, descricao, usuario_id }) {
    const id = uuidv4();
    this.db().prepare(`
      INSERT INTO lead_interacoes (id, lead_id, usuario_id, tipo, descricao)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, lead_id, usuario_id, tipo, descricao);
    return { success: true, id };
  },

  _addInteracaoSistema(leadId, descricao) {
    this.db().prepare(`
      INSERT INTO lead_interacoes (id, lead_id, tipo, descricao)
      VALUES (?, ?, 'sistema', ?)
    `).run(uuidv4(), leadId, descricao);
  },

  convertToClient(leadId) {
    const lead = this.db().prepare('SELECT * FROM leads WHERE id=?').get(leadId);
    if (!lead) return { success: false, error: 'Lead não encontrado' };

    if (lead.cliente_id) {
      return { success: false, error: 'Lead já convertido em cliente', clienteId: lead.cliente_id };
    }

    const clienteId = uuidv4();
    this.db().prepare(`
      INSERT INTO clientes (id, nome, telefone, whatsapp, email)
      VALUES (?, ?, ?, ?, ?)
    `).run(clienteId, lead.nome, lead.telefone, lead.whatsapp, lead.email);

    this.db().prepare(`
      UPDATE leads SET cliente_id=?, etapa='fechado', atualizado_em=datetime('now') WHERE id=?
    `).run(clienteId, leadId);

    this._addInteracaoSistema(leadId, 'Lead convertido em cliente');
    LogService.info('Lead convertido em cliente', { leadId, clienteId });

    return { success: true, clienteId };
  },

  // ─── CLIENTES ─────────────────────────────────────────
  getClients(filters = {}) {
    let clients = this.db().prepare('SELECT * FROM clientes WHERE ativo=1 ORDER BY nome ASC').all();

    if (filters.search) {
      const term = this.normalizeSearch(filters.search);
      clients = clients.filter(c => {
        const haystack = [
          c.nome, c.cpf_cnpj, c.telefone, c.whatsapp, c.email, c.cidade
        ].map(v => this.normalizeSearch(v)).join(' ');
        return haystack.includes(term);
      });
    }

    return { success: true, data: clients };
  },

  getClient(id) {
    const client = this.db().prepare('SELECT * FROM clientes WHERE id=?').get(id);
    if (!client) return { success: false, error: 'Cliente não encontrado' };

    const processos = this.db().prepare(`
      SELECT p.*, s.nome as servico_nome
      FROM processos p
      LEFT JOIN servicos_catalogo s ON p.servico_id = s.id
      WHERE p.cliente_id = ?
      ORDER BY p.criado_em DESC
    `).all(id);

    const veiculos = this.db().prepare(`
      SELECT * FROM cliente_veiculos WHERE cliente_id = ? ORDER BY criado_em DESC
    `).all(id);

    const financeiro = this.db().prepare(`
      SELECT l.*, p.numero as processo_numero
      FROM lancamentos l
      LEFT JOIN processos p ON l.processo_id = p.id
      WHERE l.cliente_id = ?
      ORDER BY l.data_vencimento DESC
    `).all(id);

    return { success: true, data: { ...client, processos, veiculos, financeiro } };
  },

  createClient(data) {
    const id = uuidv4();
    this.db().prepare(`
      INSERT INTO clientes (
        id, tipo, nome, cpf_cnpj, rg, email, telefone, whatsapp,
        cep, logradouro, numero, complemento, bairro, cidade, estado, observacoes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.tipo || 'PF', data.nome, data.cpf_cnpj, data.rg, data.email,
      data.telefone, data.whatsapp, data.cep, data.logradouro, data.numero,
      data.complemento, data.bairro, data.cidade || 'Ibiporã',
      data.estado || 'PR', data.observacoes
    );

    this._replaceVeiculos(id, data.veiculos || []);
    LogService.info('Cliente criado', { id, nome: data.nome });
    return { success: true, id };
  },

  updateClient(data) {
    this.db().prepare(`
      UPDATE clientes SET
        nome=?, tipo=?, cpf_cnpj=?, rg=?, email=?, telefone=?, whatsapp=?,
        cep=?, logradouro=?, numero=?, complemento=?, bairro=?, cidade=?, estado=?,
        observacoes=?, atualizado_em=datetime('now')
      WHERE id=?
    `).run(
      data.nome, data.tipo, data.cpf_cnpj, data.rg, data.email,
      data.telefone, data.whatsapp, data.cep, data.logradouro, data.numero,
      data.complemento, data.bairro, data.cidade, data.estado,
      data.observacoes, data.id
    );
    this._replaceVeiculos(data.id, data.veiculos || []);
    return { success: true };
  },

  deleteClient(id) {
    const client = this.db().prepare('SELECT id FROM clientes WHERE id=?').get(id);
    if (!client) return { success: false, error: 'Cliente não encontrado' };

    this.db().prepare(`
      UPDATE clientes SET ativo=0, atualizado_em=datetime('now') WHERE id=?
    `).run(id);
    LogService.info('Cliente desativado', { id });
    return { success: true };
  },

  _replaceVeiculos(clienteId, veiculos = []) {
    this.db().prepare('DELETE FROM cliente_veiculos WHERE cliente_id=?').run(clienteId);
    veiculos
      .filter(v => v && (v.marca || v.modelo || v.placa || v.renavam))
      .forEach(v => {
        this.db().prepare(`
          INSERT INTO cliente_veiculos (id, cliente_id, marca, modelo, placa, renavam)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), clienteId, v.marca || null, v.modelo || null,
          v.placa || null, v.renavam || null
        );
      });
  },

  search(query) {
    if (!query || query.length < 2) return { success: true, data: [] };
    const s = `%${query}%`;

    const leads = this.db().prepare(`
      SELECT 'lead' as tipo, id, nome, telefone, etapa as status FROM leads
      WHERE nome LIKE ? OR telefone LIKE ? OR whatsapp LIKE ? OR veiculo_placa LIKE ?
      LIMIT 5
    `).all(s, s, s, s);

    const clientes = this.getClients({ search: query }).data
      .slice(0, 5)
      .map(c => ({ tipo: 'cliente', id: c.id, nome: c.nome, telefone: c.telefone, status: '' }));

    return { success: true, data: [...leads, ...clientes] };
  },

  // ─── PROCESSOS ────────────────────────────────────────
  getProcessos(clienteId) {
    let sql = `
      SELECT p.*, s.nome as servico_nome, c.nome as cliente_nome
      FROM processos p
      LEFT JOIN servicos_catalogo s ON p.servico_id = s.id
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE c.ativo = 1
    `;
    const params = [];
    if (clienteId) {
      sql += ' AND p.cliente_id = ?';
      params.push(clienteId);
    }
    sql += ' ORDER BY p.criado_em DESC';
    const processos = this.db().prepare(sql).all(...params);
    return { success: true, data: processos };
  },

  createProcesso(data) {
    const id = uuidv4();
    const numero = this.gerarNumeroProcesso();

    this.db().prepare(`
      INSERT INTO processos (id, numero, cliente_id, servico_id, veiculo_placa,
        veiculo_renavam, veiculo_chassi, veiculo_modelo, veiculo_ano,
        status, descricao, valor, responsavel_id, lead_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aberto', ?, ?, ?, ?)
    `).run(
      id, numero, data.cliente_id, data.servico_id, data.veiculo_placa,
      data.veiculo_renavam, data.veiculo_chassi, data.veiculo_modelo,
      data.veiculo_ano, data.descricao, data.valor,
      data.responsavel_id, data.lead_id
    );

    // Auto-criar lançamento financeiro
    if (data.valor && data.valor > 0) {
      const FinanceiroService = require('./financeiro');
      FinanceiroService.createLancamento({
        tipo: 'receita',
        categoria: 'Serviços de Despachante',
        descricao: `Processo ${numero}`,
        valor: data.valor,
        data_vencimento: data.data_vencimento || new Date().toISOString().slice(0,10),
        cliente_id: data.cliente_id,
        processo_id: id,
      });
    }

    LogService.info('Processo criado', { id, numero });
    return { success: true, id, numero };
  },

  updateProcesso(data) {
    this.db().prepare(`
      UPDATE processos SET
        servico_id=?, veiculo_placa=?, veiculo_renavam=?, veiculo_chassi=?,
        veiculo_modelo=?, veiculo_ano=?, status=?, descricao=?, valor=?,
        responsavel_id=?, atualizado_em=datetime('now')
      WHERE id=?
    `).run(
      data.servico_id, data.veiculo_placa, data.veiculo_renavam, data.veiculo_chassi,
      data.veiculo_modelo, data.veiculo_ano, data.status, data.descricao, data.valor,
      data.responsavel_id, data.id
    );
    return { success: true };
  },

  gerarNumeroProcesso() {
    const ano = new Date().getFullYear();
    const ultimo = this.db().prepare(
      'SELECT numero FROM processos WHERE numero LIKE ? ORDER BY criado_em DESC LIMIT 1'
    ).get(`${ano}-%`);

    let seq = 1;
    if (ultimo) {
      const partes = ultimo.numero.split('-');
      seq = parseInt(partes[1] || '0') + 1;
    }

    return `${ano}-${String(seq).padStart(4, '0')}`;
  },
};

module.exports = CRMService;
