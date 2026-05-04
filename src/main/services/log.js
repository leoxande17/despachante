// src/main/services/log.js
const fs = require('fs');
const DatabaseService = require('./database');

const LogService = {
  db() { try { return DatabaseService.getDB(); } catch { return null; } },

  _log(nivel, mensagem, dados, usuarioId) {
    console.log(`[${nivel.toUpperCase()}] ${mensagem}`, dados || '');
    const db = this.db();
    if (!db) return;
    try {
      db.prepare(`
        INSERT INTO logs_sistema (nivel, mensagem, dados, usuario_id)
        VALUES (?, ?, ?, ?)
      `).run(nivel, mensagem, dados ? JSON.stringify(dados) : null, usuarioId || null);
    } catch {}
  },

  info(mensagem, dados) { this._log('info', mensagem, dados); },
  warn(mensagem, dados) { this._log('warn', mensagem, dados); },
  error(mensagem, dados) { this._log('error', mensagem, dados); },

  getRecent() {
    const db = this.db();
    if (!db) return { success: true, data: [] };
    const logs = db.prepare(`
      SELECT * FROM logs_sistema ORDER BY criado_em DESC LIMIT 100
    `).all();
    return { success: true, data: logs };
  },

  exportToFile(filePath) {
    const recent = this.getRecent();
    const lines = (recent.data || []).map(log => {
      const dados = log.dados ? ` | ${log.dados}` : '';
      return `[${log.criado_em}] ${String(log.nivel).toUpperCase()} ${log.mensagem}${dados}`;
    });
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return { success: true, path: filePath };
  }
};

module.exports = LogService;
