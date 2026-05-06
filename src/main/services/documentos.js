// src/main/services/documentos.js
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { app, shell } = require('electron');
const DatabaseService = require('./database');
const Store = require('electron-store');

const store = new Store();

const DocumentosService = {
  db() { return DatabaseService.getDB(); },
  
  getDocsDir() {
    // Primeiro verifica se há um diretório customizado configurado
    const customDir = store.get('docsDirectory');
    if (customDir && fs.existsSync(customDir)) {
      return customDir;
    }
    // Fallback para diretório padrão
    const dir = path.join(app.getPath('userData'), 'documentos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  },
  
  getDocsDirectory() {
    return store.get('docsDirectory') || null;
  },
  
  setDocsDirectory(dir) {
    if (dir && fs.existsSync(dir)) {
      store.set('docsDirectory', dir);
      return { success: true };
    }
    return { success: false, error: 'Diretório inválido' };
  },

  upload(data) {
    const cliente_id = data.cliente_id;
    const processo_id = data.processo_id;
    const tipo = data.tipo;
    const filePath = data.filePath || data.file_path;
    const fileName = data.fileName || data.nome_original || path.basename(filePath || '');

    if (!cliente_id) return { success: false, error: 'Cliente nao informado' };
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Arquivo nao encontrado' };
    }

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

  list(processoId) {
    const docs = this.db().prepare(
      `SELECT d.*, c.nome as cliente_nome, p.numero as processo_numero
       FROM documentos d
       LEFT JOIN clientes c ON d.cliente_id = c.id
       LEFT JOIN processos p ON d.processo_id = p.id
       WHERE d.processo_id=? ORDER BY d.criado_em DESC`
    ).all(processoId);
    return { success: true, data: docs };
  },

  listByCliente(clienteId, filters = {}) {
    let sql = `
      SELECT d.*, c.nome as cliente_nome, p.numero as processo_numero
      FROM documentos d
      LEFT JOIN clientes c ON d.cliente_id = c.id
      LEFT JOIN processos p ON d.processo_id = p.id
      WHERE d.cliente_id=?
    `;
    const params = [clienteId];
    if (filters?.processo_id) {
      sql += ' AND d.processo_id = ?';
      params.push(filters.processo_id);
    }
    sql += ' ORDER BY d.criado_em DESC';
    const docs = this.db().prepare(sql).all(...params);
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

module.exports = DocumentosService;
