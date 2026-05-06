// src/main/services/caixa.js
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('./database');

const CaixaService = {
  db() { return DatabaseService.getDB(); },

  abrir({ usuario_id, valor_inicial, data_abertura }) {
    const aberto = this.db().prepare("SELECT id FROM caixas WHERE status='aberto'").get();
    if (aberto) return { success: false, error: 'Já existe um caixa aberto' };
    const id = uuidv4();
    const dataAbertura = data_abertura ? `${data_abertura} 00:00:00` : new Date().toISOString();
    this.db().prepare(`
      INSERT INTO caixas (id, usuario_id, data_abertura, valor_inicial, status)
      VALUES (?, ?, ?, ?, 'aberto')
    `).run(id, usuario_id || 'system', dataAbertura, valor_inicial || 0);
    return { success: true, id };
  },

  fechar({ id, valor_final, observacoes }) {
    this.db().prepare(`
      UPDATE caixas SET status='fechado', data_fechamento=datetime('now'),
      valor_final=?, observacoes=? WHERE id=?
    `).run(valor_final, observacoes || null, id);
    return { success: true };
  },

  getAtual() {
    const caixa = this.db().prepare(
      "SELECT * FROM caixas WHERE status='aberto' ORDER BY criado_em DESC LIMIT 1"
    ).get();
    return { success: true, data: caixa || null };
  },

  addMovimento({ caixa_id, tipo, descricao, valor, forma_pagamento, lancamento_id, usuario_id }) {
    const id = uuidv4();
    this.db().prepare(`
      INSERT INTO caixa_movimentos (id, caixa_id, tipo, descricao, valor, forma_pagamento, lancamento_id, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, caixa_id, tipo, descricao, valor, forma_pagamento || null, lancamento_id || null, usuario_id || null);
    return { success: true, id };
  },

  getMovimentos(caixaId) {
    if (!caixaId) return { success: true, data: [] };
    const movs = this.db().prepare(
      'SELECT * FROM caixa_movimentos WHERE caixa_id=? ORDER BY criado_em ASC'
    ).all(caixaId);
    return { success: true, data: movs };
  },

  getHistorico({ data_inicio, data_fim } = {}) {
    let sql = 'SELECT * FROM caixas WHERE 1=1';
    const params = [];
    if (data_inicio) { sql += ' AND date(data_abertura) >= ?'; params.push(data_inicio); }
    if (data_fim) { sql += ' AND date(data_abertura) <= ?'; params.push(data_fim); }
    sql += ' ORDER BY criado_em DESC LIMIT 30';
    const caixas = this.db().prepare(sql).all(...params).map(caixa => ({
      ...caixa,
      movimentos: this.db().prepare(
        'SELECT * FROM caixa_movimentos WHERE caixa_id=? ORDER BY criado_em ASC'
      ).all(caixa.id),
    }));
    return { success: true, data: caixas };
  }
};

module.exports = CaixaService;
