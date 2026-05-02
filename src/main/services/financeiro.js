// src/main/services/financeiro.js
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('./database');

const FinanceiroService = {
  db() { return DatabaseService.getDB(); },

  getContasReceber(filters = {}) {
    let sql = `
      SELECT l.*, c.nome as cliente_nome, p.numero as processo_numero
      FROM lancamentos l
      LEFT JOIN clientes c ON l.cliente_id = c.id
      LEFT JOIN processos p ON l.processo_id = p.id
      WHERE l.tipo = 'receita'
    `;
    const params = [];

    if (filters.status) { sql += ' AND l.status = ?'; params.push(filters.status); }
    if (filters.cliente_id) { sql += ' AND l.cliente_id = ?'; params.push(filters.cliente_id); }
    if (filters.data_inicio) { sql += ' AND l.data_vencimento >= ?'; params.push(filters.data_inicio); }
    if (filters.data_fim) { sql += ' AND l.data_vencimento <= ?'; params.push(filters.data_fim); }

    // Auto-marcar atrasados
    this.db().prepare(`
      UPDATE lancamentos SET status='atrasado'
      WHERE tipo='receita' AND status='pendente'
      AND date(data_vencimento) < date('now')
    `).run();

    sql += ' ORDER BY l.data_vencimento ASC';
    return { success: true, data: this.db().prepare(sql).all(...params) };
  },

  getContasPagar(filters = {}) {
    let sql = `
      SELECT l.* FROM lancamentos l WHERE l.tipo = 'despesa'
    `;
    const params = [];

    if (filters.status) { sql += ' AND l.status = ?'; params.push(filters.status); }

    this.db().prepare(`
      UPDATE lancamentos SET status='atrasado'
      WHERE tipo='despesa' AND status='pendente'
      AND date(data_vencimento) < date('now')
    `).run();

    sql += ' ORDER BY l.data_vencimento ASC';
    return { success: true, data: this.db().prepare(sql).all(...params) };
  },

  createLancamento(data) {
    const id = uuidv4();
    this.db().prepare(`
      INSERT INTO lancamentos (id, tipo, categoria, descricao, valor,
        data_vencimento, status, forma_pagamento, cliente_id, processo_id, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?)
    `).run(
      id, data.tipo, data.categoria, data.descricao, data.valor,
      data.data_vencimento, data.forma_pagamento,
      data.cliente_id, data.processo_id, data.observacoes
    );
    return { success: true, id };
  },

  updateLancamento(data) {
    this.db().prepare(`
      UPDATE lancamentos SET
        categoria=?, descricao=?, valor=?, data_vencimento=?,
        forma_pagamento=?, observacoes=?, atualizado_em=datetime('now')
      WHERE id=?
    `).run(data.categoria, data.descricao, data.valor,
      data.data_vencimento, data.forma_pagamento, data.observacoes, data.id);
    return { success: true };
  },

  registrarPagamento({ id, forma_pagamento, data_pagamento, valor_pago }) {
    this.db().prepare(`
      UPDATE lancamentos SET
        status='pago', forma_pagamento=?,
        data_pagamento=?, atualizado_em=datetime('now')
      WHERE id=?
    `).run(forma_pagamento, data_pagamento || new Date().toISOString().slice(0,10), id);

    // Registrar no caixa se estiver aberto
    const caixaAberto = this.db().prepare(
      "SELECT id FROM caixas WHERE status='aberto' ORDER BY criado_em DESC LIMIT 1"
    ).get();

    if (caixaAberto) {
      const lancamento = this.db().prepare('SELECT * FROM lancamentos WHERE id=?').get(id);
      this.db().prepare(`
        INSERT INTO caixa_movimentos (id, caixa_id, tipo, descricao, valor, forma_pagamento, lancamento_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), caixaAberto.id,
        lancamento.tipo === 'receita' ? 'entrada' : 'saida',
        lancamento.descricao, valor_pago || lancamento.valor,
        forma_pagamento, id
      );
    }

    return { success: true };
  },

  getFluxoCaixa({ data_inicio, data_fim }) {
    const rows = this.db().prepare(`
      SELECT
        date(data_vencimento) as data,
        SUM(CASE WHEN tipo='receita' AND status='pago' THEN valor ELSE 0 END) as receitas,
        SUM(CASE WHEN tipo='despesa' AND status='pago' THEN valor ELSE 0 END) as despesas,
        SUM(CASE WHEN tipo='receita' AND status='pago' THEN valor
                 WHEN tipo='despesa' AND status='pago' THEN -valor
                 ELSE 0 END) as saldo
      FROM lancamentos
      WHERE data_vencimento BETWEEN ? AND ?
      GROUP BY date(data_vencimento)
      ORDER BY data ASC
    `).all(data_inicio, data_fim);

    return { success: true, data: rows };
  },

  getInadimplentes() {
    const rows = this.db().prepare(`
      SELECT l.*, c.nome as cliente_nome, c.telefone, c.whatsapp,
        julianday('now') - julianday(l.data_vencimento) as dias_atraso
      FROM lancamentos l
      LEFT JOIN clientes c ON l.cliente_id = c.id
      WHERE l.tipo='receita' AND l.status IN ('pendente','atrasado')
        AND date(l.data_vencimento) < date('now')
      ORDER BY dias_atraso DESC
    `).all();
    return { success: true, data: rows };
  },

  getDashboard() {
    const hoje = new Date().toISOString().slice(0,10);
    const inicioMes = hoje.slice(0,7) + '-01';

    const totalReceber = this.db().prepare(`
      SELECT COALESCE(SUM(valor),0) as total FROM lancamentos
      WHERE tipo='receita' AND status IN ('pendente','atrasado')
    `).get().total;

    const totalPagar = this.db().prepare(`
      SELECT COALESCE(SUM(valor),0) as total FROM lancamentos
      WHERE tipo='despesa' AND status IN ('pendente','atrasado')
    `).get().total;

    const receitaMes = this.db().prepare(`
      SELECT COALESCE(SUM(valor),0) as total FROM lancamentos
      WHERE tipo='receita' AND status='pago'
      AND data_pagamento >= ?
    `).get(inicioMes).total;

    const despesaMes = this.db().prepare(`
      SELECT COALESCE(SUM(valor),0) as total FROM lancamentos
      WHERE tipo='despesa' AND status='pago'
      AND data_pagamento >= ?
    `).get(inicioMes).total;

    const inadimplentes = this.db().prepare(`
      SELECT COUNT(*) as total FROM lancamentos
      WHERE tipo='receita' AND status IN ('pendente','atrasado')
      AND date(data_vencimento) < date('now')
    `).get().total;

    return {
      success: true,
      data: { totalReceber, totalPagar, receitaMes, despesaMes, inadimplentes,
              saldoMes: receitaMes - despesaMes }
    };
  },

  // Voltar lançamento pago para pendente
  reverterPagamento(id) {
    // Remove movimentos do caixa relacionados
    this.db().prepare('DELETE FROM caixa_movimentos WHERE lancamento_id = ?').run(id);
    
    // Atualiza status para pendente e limpa dados de pagamento
    this.db().prepare(`
      UPDATE lancamentos SET
        status='pendente',
        forma_pagamento=NULL,
        data_pagamento=NULL,
        atualizado_em=datetime('now')
      WHERE id=?
    `).run(id);
    
    return { success: true };
  },
};

module.exports = FinanceiroService;
