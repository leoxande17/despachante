// src/main/services/documentos.js
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { app, shell } = require('electron');
const DatabaseService = require('./database');

const DocumentosService = {
  db() { return DatabaseService.getDB(); },
  getDocsDir() {
    const dir = path.join(app.getPath('userData'), 'documentos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  },

  upload({ cliente_id, processo_id, tipo, filePath, fileName }) {
    const id = uuidv4();
    const ext = path.extname(fileName);
    const nomeArquivo = `${id}${ext}`;
    const clienteDir = path.join(this.getDocsDir(), cliente_id);
    if (!fs.existsSync(clienteDir)) fs.mkdirSync(clienteDir, { recursive: true });
    const destino = path.join(clienteDir, nomeArquivo);

    fs.copyFileSync(filePath, destino);
    const stats = fs.statSync(destino);

    this.db().prepare(`
      INSERT INTO documentos (id, processo_id, cliente_id, tipo, nome_original, nome_arquivo, caminho, tamanho, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
    `).run(id, processo_id || null, cliente_id, tipo, fileName, nomeArquivo, destino, stats.size);

    return { success: true, id };
  },

  list(clienteId) {
    const docs = this.db().prepare(
      'SELECT * FROM documentos WHERE cliente_id=? ORDER BY criado_em DESC'
    ).all(clienteId);
    return { success: true, data: docs };
  },

  delete(id) {
    const doc = this.db().prepare('SELECT caminho FROM documentos WHERE id=?').get(id);
    if (doc?.caminho && fs.existsSync(doc.caminho)) fs.unlinkSync(doc.caminho);
    this.db().prepare('DELETE FROM documentos WHERE id=?').run(id);
    return { success: true };
  },

  updateStatus({ id, status, observacao }) {
    this.db().prepare(
      "UPDATE documentos SET status=?, observacao=?, atualizado_em=datetime('now') WHERE id=?"
    ).run(status, observacao || null, id);
    return { success: true };
  },

  openFile(id) {
    const doc = this.db().prepare('SELECT caminho FROM documentos WHERE id=?').get(id);
    if (doc?.caminho && fs.existsSync(doc.caminho)) shell.openPath(doc.caminho);
    return { success: true };
  }
};

// ─────────────────────────────────────────────────────────────
// src/main/services/caixa.js
// ─────────────────────────────────────────────────────────────
const { v4: uuidv4: uuidv4Caixa } = require('uuid');
const DatabaseServiceCaixa = require('./database');

const CaixaService = {
  db() { return DatabaseServiceCaixa.getDB(); },

  abrir({ usuario_id, valor_inicial }) {
    const aberto = this.db().prepare("SELECT id FROM caixas WHERE status='aberto'").get();
    if (aberto) return { success: false, error: 'Já existe um caixa aberto' };
    const id = uuidv4();
    this.db().prepare(`
      INSERT INTO caixas (id, usuario_id, data_abertura, valor_inicial, status)
      VALUES (?, ?, datetime('now'), ?, 'aberto')
    `).run(id, usuario_id || 'system', valor_inicial || 0);
    return { success: true, id };
  },

  fechar({ id, valor_final, observacoes }) {
    this.db().prepare(`
      UPDATE caixas SET status='fechado', data_fechamento=datetime('now'), valor_final=?, observacoes=? WHERE id=?
    `).run(valor_final, observacoes || null, id);
    return { success: true };
  },

  getAtual() {
    const caixa = this.db().prepare("SELECT * FROM caixas WHERE status='aberto' ORDER BY criado_em DESC LIMIT 1").get();
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
    return { success: true, data: this.db().prepare(sql).all(...params) };
  }
};

module.exports = { DocumentosService, CaixaService };
