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

module.exports = { DocumentosService };
