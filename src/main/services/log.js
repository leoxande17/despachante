// src/main/services/log.js
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
  }
};

module.exports = LogService;

// ─────────────────────────────────────────────────────────────
// src/main/services/whatsapp.js
// ─────────────────────────────────────────────────────────────
// Note: WhatsApp integration requires 'baileys' or '@whiskeysockets/baileys'
// Install with: npm install @whiskeysockets/baileys
// This is a placeholder that shows the integration structure.

const DatabaseService2 = require('./database');
const LogService2 = require('./log');

let whatsappStatus = 'disconnected';
let mainWindowRef = null;

const WhatsAppService = {
  db() { return DatabaseService2.getDB(); },

  async initialize(mainWindow) {
    mainWindowRef = mainWindow;
    LogService2.info('WhatsApp: Iniciando conexão');

    try {
      // Dynamic import to avoid crash if baileys not installed
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import('@whiskeysockets/baileys').catch(() => null) || {};
      
      if (!makeWASocket) {
        LogService2.warn('WhatsApp: Biblioteca Baileys não instalada. Execute: npm install @whiskeysockets/baileys');
        return { success: false, error: 'Baileys não instalado' };
      }

      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

      const sock = makeWASocket({ auth: state, printQRInTerminal: false });

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          mainWindow?.webContents.send('whatsapp:qr', qr);
        }
        if (connection === 'close') {
          whatsappStatus = 'disconnected';
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) this.initialize(mainWindow);
        } else if (connection === 'open') {
          whatsappStatus = 'connected';
          mainWindow?.webContents.send('whatsapp:ready');
          LogService2.info('WhatsApp: Conectado');
        }
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          if (!msg.key.fromMe) {
            mainWindow?.webContents.send('whatsapp:message', {
              from: msg.key.remoteJid,
              text: msg.message?.conversation || msg.message?.extendedTextMessage?.text,
              timestamp: msg.messageTimestamp
            });
          }
        }
      });

      this._sock = sock;
      whatsappStatus = 'connecting';
      return { success: true };

    } catch (err) {
      LogService2.error('WhatsApp: Erro na inicialização', err.message);
      return { success: false, error: err.message };
    }
  },

  async sendMessage({ numero, mensagem }) {
    if (!this._sock || whatsappStatus !== 'connected') {
      return { success: false, error: 'WhatsApp não conectado' };
    }
    const jid = numero.replace(/\D/g, '') + '@s.whatsapp.net';
    await this._sock.sendMessage(jid, { text: mensagem });
    return { success: true };
  },

  getTemplates() {
    const db = this.db();
    const templates = db.prepare('SELECT * FROM whatsapp_templates WHERE ativo=1 ORDER BY nome').all();
    return { success: true, data: templates };
  },

  getStatus() {
    return { success: true, status: whatsappStatus };
  },

  async disconnect() {
    if (this._sock) {
      await this._sock.logout();
      this._sock = null;
    }
    whatsappStatus = 'disconnected';
    return { success: true };
  }
};

module.exports = WhatsAppService;
