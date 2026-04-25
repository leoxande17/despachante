// src/main/services/whatsapp.js
const DatabaseService = require('./database');
const LogService = require('./log');

let whatsappStatus = 'disconnected';
let _sock = null;
let mainWindowRef = null;

const WhatsAppService = {
  db() { return DatabaseService.getDB(); },

  async initialize(mainWindow) {
    mainWindowRef = mainWindow;
    LogService.info('WhatsApp: Iniciando conexão');

    try {
      let baileys;
      try { baileys = require('@whiskeysockets/baileys'); }
      catch (e) {
        LogService.warn('WhatsApp: Biblioteca Baileys não instalada. Execute: npm install @whiskeysockets/baileys');
        return { success: false, error: 'Baileys não instalado. Execute: npm install @whiskeysockets/baileys' };
      }

      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

      const sock = makeWASocket({ auth: state, printQRInTerminal: false });

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) mainWindow?.webContents.send('whatsapp:qr', qr);
        if (connection === 'close') {
          whatsappStatus = 'disconnected';
          const code = lastDisconnect?.error?.output?.statusCode;
          if (code !== DisconnectReason.loggedOut) {
            await this.initialize(mainWindow);
          }
        } else if (connection === 'open') {
          whatsappStatus = 'connected';
          mainWindow?.webContents.send('whatsapp:ready');
          LogService.info('WhatsApp: Conectado com sucesso');
        }
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          if (msg.key.fromMe) continue;
          const from = msg.key.remoteJid;
          const text = msg.message?.conversation
            || msg.message?.extendedTextMessage?.text
            || '';

          mainWindow?.webContents.send('whatsapp:message', { from, text, timestamp: msg.messageTimestamp });

          // Auto-resposta de boas-vindas (fluxo básico)
          const template = this.db().prepare(
            "SELECT mensagem FROM whatsapp_templates WHERE nome='Boas-vindas' AND ativo=1"
          ).get();

          if (template) {
            await sock.sendMessage(from, {
              text: template.mensagem.replace('{{atendente}}', 'equipe DespachaPR')
            });
          }
        }
      });

      _sock = sock;
      whatsappStatus = 'connecting';
      return { success: true };

    } catch (err) {
      LogService.error('WhatsApp: Erro na inicialização', err.message);
      return { success: false, error: err.message };
    }
  },

  async sendMessage({ numero, mensagem }) {
    if (!_sock || whatsappStatus !== 'connected') {
      return { success: false, error: 'WhatsApp não conectado' };
    }
    const jid = numero.replace(/\D/g, '') + '@s.whatsapp.net';
    await _sock.sendMessage(jid, { text: mensagem });
    return { success: true };
  },

  getTemplates() {
    const templates = this.db().prepare(
      'SELECT * FROM whatsapp_templates WHERE ativo=1 ORDER BY nome'
    ).all();
    return { success: true, data: templates };
  },

  getStatus() {
    return { success: true, status: whatsappStatus };
  },

  async disconnect() {
    if (_sock) { try { await _sock.logout(); } catch {} _sock = null; }
    whatsappStatus = 'disconnected';
    return { success: true };
  }
};

module.exports = WhatsAppService;
