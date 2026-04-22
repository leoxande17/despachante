// src/main/preload.js - Bridge segura entre renderer e main
const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs seguras para o renderer via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // Controles da janela
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // Auth
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: (token) => ipcRenderer.invoke('auth:logout', token),
    verify: (token) => ipcRenderer.invoke('auth:verify', token),
    changePassword: (data) => ipcRenderer.invoke('auth:changePassword', data),
    listUsers: (token) => ipcRenderer.invoke('auth:listUsers', token),
    createUser: (data) => ipcRenderer.invoke('auth:createUser', data),
  },

  // CRM
  crm: {
    getLeads: (filters) => ipcRenderer.invoke('crm:getLeads', filters),
    createLead: (data) => ipcRenderer.invoke('crm:createLead', data),
    updateLead: (data) => ipcRenderer.invoke('crm:updateLead', data),
    moveLead: (data) => ipcRenderer.invoke('crm:moveLead', data),
    deleteLead: (id) => ipcRenderer.invoke('crm:deleteLead', id),
    getLeadHistory: (id) => ipcRenderer.invoke('crm:getLeadHistory', id),
    addInteraction: (data) => ipcRenderer.invoke('crm:addInteraction', data),
    convertToClient: (id) => ipcRenderer.invoke('crm:convertToClient', id),
    getClients: (filters) => ipcRenderer.invoke('crm:getClients', filters),
    getClient: (id) => ipcRenderer.invoke('crm:getClient', id),
    updateClient: (data) => ipcRenderer.invoke('crm:updateClient', data),
    search: (query) => ipcRenderer.invoke('crm:search', query),
  },

  // Processos
  processo: {
    list: (clienteId) => ipcRenderer.invoke('processo:list', clienteId),
    create: (data) => ipcRenderer.invoke('processo:create', data),
    update: (data) => ipcRenderer.invoke('processo:update', data),
  },

  // Documentos
  docs: {
    upload: (data) => ipcRenderer.invoke('docs:upload', data),
    list: (processoId) => ipcRenderer.invoke('docs:list', processoId),
    delete: (id) => ipcRenderer.invoke('docs:delete', id),
    updateStatus: (data) => ipcRenderer.invoke('docs:updateStatus', data),
    open: (id) => ipcRenderer.invoke('docs:open', id),
    selectFile: () => ipcRenderer.invoke('docs:selectFile'),
  },

  // Financeiro
  financeiro: {
    getContasReceber: (filters) => ipcRenderer.invoke('fin:getContasReceber', filters),
    getContasPagar: (filters) => ipcRenderer.invoke('fin:getContasPagar', filters),
    createLancamento: (data) => ipcRenderer.invoke('fin:createLancamento', data),
    updateLancamento: (data) => ipcRenderer.invoke('fin:updateLancamento', data),
    registrarPagamento: (data) => ipcRenderer.invoke('fin:registrarPagamento', data),
    getFluxoCaixa: (periodo) => ipcRenderer.invoke('fin:getFluxoCaixa', periodo),
    getInadimplentes: () => ipcRenderer.invoke('fin:getInadimplentes'),
    getDashboard: () => ipcRenderer.invoke('fin:getDashboard'),
  },

  // Caixa
  caixa: {
    abrir: (data) => ipcRenderer.invoke('caixa:abrir', data),
    fechar: (data) => ipcRenderer.invoke('caixa:fechar', data),
    getAtual: () => ipcRenderer.invoke('caixa:getAtual'),
    addMovimento: (data) => ipcRenderer.invoke('caixa:addMovimento', data),
    getMovimentos: (caixaId) => ipcRenderer.invoke('caixa:getMovimentos', caixaId),
    getHistorico: (filters) => ipcRenderer.invoke('caixa:getHistorico', filters),
  },

  // Nota Fiscal
  nf: {
    emitir: (data) => ipcRenderer.invoke('nf:emitir', data),
    list: (filters) => ipcRenderer.invoke('nf:list', filters),
    cancelar: (data) => ipcRenderer.invoke('nf:cancelar', data),
    getServicos: () => ipcRenderer.invoke('nf:getServicos'),
    openPDF: (id) => ipcRenderer.invoke('nf:openPDF', id),
  },

  // Relatórios
  relatorios: {
    vendas: (filters) => ipcRenderer.invoke('rel:vendas', filters),
    conversao: (filters) => ipcRenderer.invoke('rel:conversao', filters),
    receitaMensal: (filters) => ipcRenderer.invoke('rel:receitaMensal', filters),
    servicosMaisVendidos: (filters) => ipcRenderer.invoke('rel:servicosMaisVendidos', filters),
    exportExcel: (data) => ipcRenderer.invoke('rel:exportExcel', data),
    exportPDF: (data) => ipcRenderer.invoke('rel:exportPDF', data),
    dashboard: () => ipcRenderer.invoke('rel:dashboard'),
  },

  // WhatsApp
  whatsapp: {
    init: () => ipcRenderer.invoke('whatsapp:init'),
    sendMessage: (data) => ipcRenderer.invoke('whatsapp:sendMessage', data),
    getTemplates: () => ipcRenderer.invoke('whatsapp:getTemplates'),
    getStatus: () => ipcRenderer.invoke('whatsapp:getStatus'),
    disconnect: () => ipcRenderer.invoke('whatsapp:disconnect'),
    onQR: (callback) => ipcRenderer.on('whatsapp:qr', (_, qr) => callback(qr)),
    onReady: (callback) => ipcRenderer.on('whatsapp:ready', callback),
    onMessage: (callback) => ipcRenderer.on('whatsapp:message', (_, msg) => callback(msg)),
  },

  // Sistema
  system: {
    backup: () => ipcRenderer.invoke('system:backup'),
  },

  // Logs
  log: {
    getRecent: () => ipcRenderer.invoke('log:getRecent'),
  },

  // Notificações
  notifications: {
    getAll: () => ipcRenderer.invoke('notification:getAll'),
    markRead: (id) => ipcRenderer.invoke('notification:markRead', id),
    onNew: (callback) => ipcRenderer.on('notification:new', (_, n) => callback(n)),
  },
});
