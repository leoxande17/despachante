// src/main/services/whatsapp.js
const DatabaseService = require('./database');
const LogService = require('./log');
const SettingsService = require('./settings');
const { v4: uuidv4 } = require('uuid');

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
      let QRCode;
      try { baileys = require('@whiskeysockets/baileys'); }
      catch (e) {
        LogService.warn('WhatsApp: Biblioteca Baileys não instalada. Execute: npm install @whiskeysockets/baileys');
        return { success: false, error: 'Baileys não instalado. Execute: npm install @whiskeysockets/baileys' };
      }

      try { QRCode = require('qrcode'); }
      catch (e) {
        return { success: false, error: 'Biblioteca qrcode não instalada. Execute: npm install' };
      }

      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

      const sock = makeWASocket({ auth: state, printQRInTerminal: false });

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          whatsappStatus = 'connecting';
          const qrImage = await QRCode.toDataURL(qr, { margin: 1, width: 260 });
          mainWindow?.webContents.send('whatsapp:qr', qrImage);
        }
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

  createTemplate({ nome, categoria, mensagem }) {
    if (!String(nome || '').trim()) return { success: false, error: 'Nome obrigatório' };
    if (!String(mensagem || '').trim()) return { success: false, error: 'Mensagem obrigatória' };
    const id = uuidv4();
    this.db().prepare(`
      INSERT INTO whatsapp_templates (id, nome, categoria, mensagem, ativo)
      VALUES (?, ?, ?, ?, 1)
    `).run(id, String(nome).slice(0, 80), String(categoria || '').slice(0, 40), String(mensagem).slice(0, 1000));
    return { success: true, id };
  },

  updateTemplate({ id, nome, categoria, mensagem, ativo = 1 }) {
    this.db().prepare(`
      UPDATE whatsapp_templates SET nome=?, categoria=?, mensagem=?, ativo=? WHERE id=?
    `).run(String(nome || '').slice(0, 80), String(categoria || '').slice(0, 40), String(mensagem || '').slice(0, 1000), ativo ? 1 : 0, id);
    return { success: true };
  },

  deleteTemplate(id) {
    this.db().prepare('UPDATE whatsapp_templates SET ativo=0 WHERE id=?').run(id);
    return { success: true };
  },

  getFlows() {
    const defaults = [
      { id: 'boas_vindas', nome: 'Boas-vindas', desc: 'Enviado ao primeiro contato de um novo número', ativo: true },
      { id: 'coleta_dados', nome: 'Coleta de Dados', desc: 'Solicita CPF, placa e serviço automaticamente', ativo: true },
      { id: 'lembrete_vencimento', nome: 'Lembrete de Vencimento', desc: 'Avisa sobre licenciamento próximo ao vencimento', ativo: false },
    ];
    const saved = SettingsService.get('whatsappFlows').data;
    return { success: true, data: Array.isArray(saved) ? saved : defaults };
  },

  saveFlows(flows) {
    SettingsService.set('whatsappFlows', Array.isArray(flows) ? flows : []);
    return { success: true };
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
