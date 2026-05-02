// src/main/main.js - Processo principal do Electron
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Importar módulos do backend
const DatabaseService = require('./services/database');
const AuthService = require('./services/auth');
const CRMService = require('./services/crm');
const FinanceiroService = require('./services/financeiro');
const DocumentosService = require('./services/documentos');
const CaixaService = require('./services/caixa');
const NotaFiscalService = require('./services/notafiscal');
const RelatoriosService = require('./services/relatorios');
const LogService = require('./services/log');
const WhatsAppService = require('./services/whatsapp');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let db;

// ─── Inicialização do App ───────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    // Inicializar banco de dados
    db = await DatabaseService.initialize();
    LogService.info('Banco de dados inicializado');

    createMainWindow();
    setupIpcHandlers();
  } catch (err) {
    console.error('Erro fatal na inicialização:', err);
    dialog.showErrorBox('Erro Fatal', `Não foi possível inicializar o sistema:\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Janela Principal ───────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    frame: false, // Barra de título customizada
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.ico'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    LogService.info('Aplicação iniciada');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    DatabaseService.close();
  });
}

// ─── IPC Handlers ──────────────────────────────────────────────────────────
function setupIpcHandlers() {
  // Controles da janela
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Auth
  ipcMain.handle('auth:login', (_, credentials) => AuthService.login(credentials));
  ipcMain.handle('auth:logout', (_, token) => AuthService.logout(token));
  ipcMain.handle('auth:verify', (_, token) => AuthService.verifyToken(token));
  ipcMain.handle('auth:changePassword', (_, data) => AuthService.changePassword(data));
  ipcMain.handle('auth:listUsers', (_, token) => AuthService.listUsers(token));
  ipcMain.handle('auth:createUser', (_, data) => AuthService.createUser(data));

  // CRM / Leads
  ipcMain.handle('crm:getLeads', (_, filters) => CRMService.getLeads(filters));
  ipcMain.handle('crm:createLead', (_, data) => CRMService.createLead(data));
  ipcMain.handle('crm:updateLead', (_, data) => CRMService.updateLead(data));
  ipcMain.handle('crm:moveLead', (_, data) => CRMService.moveLead(data));
  ipcMain.handle('crm:deleteLead', (_, id) => CRMService.deleteLead(id));
  ipcMain.handle('crm:getLeadHistory', (_, id) => CRMService.getLeadHistory(id));
  ipcMain.handle('crm:addInteraction', (_, data) => CRMService.addInteraction(data));
  ipcMain.handle('crm:convertToClient', (_, id) => CRMService.convertToClient(id));
  ipcMain.handle('crm:getClients', (_, filters) => CRMService.getClients(filters));
  ipcMain.handle('crm:getClient', (_, id) => CRMService.getClient(id));
  ipcMain.handle('crm:updateClient', (_, data) => CRMService.updateClient(data));
  ipcMain.handle('crm:search', (_, query) => CRMService.search(query));

  // Processos
  ipcMain.handle('processo:list', (_, clienteId) => CRMService.getProcessos(clienteId));
  ipcMain.handle('processo:create', (_, data) => CRMService.createProcesso(data));
  ipcMain.handle('processo:update', (_, data) => CRMService.updateProcesso(data));

  // Documentos
  ipcMain.handle('docs:upload', (_, data) => DocumentosService.upload(data));
  ipcMain.handle('docs:list', (_, processoId) => DocumentosService.list(processoId));
  ipcMain.handle('docs:delete', (_, id) => DocumentosService.delete(id));
  ipcMain.handle('docs:updateStatus', (_, data) => DocumentosService.updateStatus(data));
  ipcMain.handle('docs:open', (_, id) => DocumentosService.openFile(id));
  ipcMain.handle('docs:selectFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Documentos', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'] }
      ]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Selecionar diretório para documentos
  ipcMain.handle('docs:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Salvar diretório de documentos
  ipcMain.handle('docs:setDirectory', (_, dir) => DocumentosService.setDocsDirectory(dir));
  ipcMain.handle('docs:getDirectory', () => DocumentosService.getDocsDirectory());

  // Financeiro
  ipcMain.handle('fin:getContasReceber', (_, filters) => FinanceiroService.getContasReceber(filters));
  ipcMain.handle('fin:getContasPagar', (_, filters) => FinanceiroService.getContasPagar(filters));
  ipcMain.handle('fin:createLancamento', (_, data) => FinanceiroService.createLancamento(data));
  ipcMain.handle('fin:updateLancamento', (_, data) => FinanceiroService.updateLancamento(data));
  ipcMain.handle('fin:registrarPagamento', (_, data) => FinanceiroService.registrarPagamento(data));
  ipcMain.handle('fin:getFluxoCaixa', (_, periodo) => FinanceiroService.getFluxoCaixa(periodo));
  ipcMain.handle('fin:getInadimplentes', () => FinanceiroService.getInadimplentes());
  ipcMain.handle('fin:getDashboard', () => FinanceiroService.getDashboard());
  ipcMain.handle('fin:reverterPagamento', (_, id) => FinanceiroService.reverterPagamento(id));

  // Caixa
  ipcMain.handle('caixa:abrir', (_, data) => CaixaService.abrir(data));
  ipcMain.handle('caixa:fechar', (_, data) => CaixaService.fechar(data));
  ipcMain.handle('caixa:getAtual', () => CaixaService.getAtual());
  ipcMain.handle('caixa:addMovimento', (_, data) => CaixaService.addMovimento(data));
  ipcMain.handle('caixa:getMovimentos', (_, caixaId) => CaixaService.getMovimentos(caixaId));
  ipcMain.handle('caixa:getHistorico', (_, filters) => CaixaService.getHistorico(filters));

  // Nota Fiscal
  ipcMain.handle('nf:emitir', (_, data) => NotaFiscalService.emitir(data));
  ipcMain.handle('nf:list', (_, filters) => NotaFiscalService.list(filters));
  ipcMain.handle('nf:cancelar', (_, data) => NotaFiscalService.cancelar(data));
  ipcMain.handle('nf:getServicos', () => NotaFiscalService.getServicos());
  ipcMain.handle('nf:openPDF', (_, id) => NotaFiscalService.openPDF(id));

  // Relatórios
  ipcMain.handle('rel:vendas', (_, filters) => RelatoriosService.vendas(filters));
  ipcMain.handle('rel:conversao', (_, filters) => RelatoriosService.conversao(filters));
  ipcMain.handle('rel:receitaMensal', (_, filters) => RelatoriosService.receitaMensal(filters));
  ipcMain.handle('rel:servicosMaisVendidos', (_, filters) => RelatoriosService.servicosMaisVendidos(filters));
  ipcMain.handle('rel:exportExcel', (_, data) => RelatoriosService.exportExcel(data));
  ipcMain.handle('rel:exportPDF', (_, data) => RelatoriosService.exportPDF(data));
  ipcMain.handle('rel:dashboard', () => RelatoriosService.getDashboard());

  // Backup
  ipcMain.handle('system:backup', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `backup-despachapr-${new Date().toISOString().slice(0,10)}.zip`,
      filters: [{ name: 'Backup', extensions: ['zip'] }]
    });
    if (!result.canceled) {
      return DatabaseService.backup(result.filePath);
    }
    return null;
  });

  // WhatsApp
  ipcMain.handle('whatsapp:init', () => WhatsAppService.initialize(mainWindow));
  ipcMain.handle('whatsapp:sendMessage', (_, data) => WhatsAppService.sendMessage(data));
  ipcMain.handle('whatsapp:getTemplates', () => WhatsAppService.getTemplates());
  ipcMain.handle('whatsapp:getStatus', () => WhatsAppService.getStatus());
  ipcMain.handle('whatsapp:disconnect', () => WhatsAppService.disconnect());

  // Logs
  ipcMain.handle('log:getRecent', () => LogService.getRecent());

  // Notificações
  ipcMain.handle('notification:getAll', () => NotificacaoService.getAll());
  ipcMain.handle('notification:markRead', (_, id) => NotificacaoService.markRead(id));
}

module.exports = { mainWindow };
