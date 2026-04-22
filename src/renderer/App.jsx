// src/renderer/App.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import LoginPage from './pages/LoginPage';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import CRMPage from './pages/CRMPage';
import ClientesPage from './pages/ClientesPage';
import FinanceiroPage from './pages/FinanceiroPage';
import CaixaPage from './pages/CaixaPage';
import DocumentosPage from './pages/DocumentosPage';
import NotasFiscaisPage from './pages/NotasFiscaisPage';
import RelatoriosPage from './pages/RelatoriosPage';
import WhatsAppPage from './pages/WhatsAppPage';
import ConfigPage from './pages/ConfigPage';
import ToastContainer from './components/ToastContainer';

// ─── Contexts ───────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const ToastContext = createContext(null);
export const NavContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
export const useToast = () => useContext(ToastContext);
export const useNav = () => useContext(NavContext);

// ─── Mock API (used in development without Electron) ─────────────
const api = window.electronAPI || createMockAPI();

function createMockAPI() {
  // Stub for browser-only development
  const mockLeads = [
    { id: '1', nome: 'Lucas Martins', telefone: '(43) 99801-2345', origem: 'whatsapp', etapa: 'novo', servico_interesse: 'Transferência', valor_estimado: 280, posicao_kanban: 1 },
    { id: '2', nome: 'Camila Pereira', telefone: '(43) 99712-8901', origem: 'indicacao', etapa: 'em_atendimento', servico_interesse: 'Licenciamento', valor_estimado: 120, posicao_kanban: 1 },
    { id: '3', nome: 'Diego Santos', telefone: '(43) 99623-4567', origem: 'instagram', etapa: 'proposta', servico_interesse: 'Emplacamento', valor_estimado: 350, posicao_kanban: 1 },
    { id: '4', nome: 'Patricia Lima', telefone: '(43) 99534-9012', origem: 'google', etapa: 'negociacao', servico_interesse: 'Transferência', valor_estimado: 280, posicao_kanban: 1 },
    { id: '5', nome: 'Marcos Souza', telefone: '(43) 99401-3456', origem: 'whatsapp', etapa: 'fechado', servico_interesse: 'CNH', valor_estimado: 180, posicao_kanban: 1 },
    { id: '6', nome: 'Juliana Costa', telefone: '(43) 99312-7890', origem: 'manual', etapa: 'perdido', servico_interesse: 'Vistoria', valor_estimado: 150, posicao_kanban: 1, motivo_perda: 'Preço' },
    { id: '7', nome: 'Felipe Oliveira', telefone: '(43) 99234-5678', origem: 'whatsapp', etapa: 'novo', servico_interesse: 'CRLV', valor_estimado: 80, posicao_kanban: 2 },
    { id: '8', nome: 'Amanda Rodrigues', telefone: '(43) 99145-6789', origem: 'indicacao', etapa: 'em_atendimento', servico_interesse: 'Regularização', valor_estimado: 200, posicao_kanban: 2 },
  ];

  const mockClientes = [
    { id: 'c1', nome: 'João Paulo Ferreira', cpf_cnpj: '123.456.789-00', telefone: '(43) 99801-2345', cidade: 'Ibiporã', tipo: 'PF' },
    { id: 'c2', nome: 'Maria Santos da Costa', cpf_cnpj: '987.654.321-00', telefone: '(43) 99712-8901', cidade: 'Londrina', tipo: 'PF' },
    { id: 'c3', nome: 'Roberto Almeida Lima', cpf_cnpj: '456.789.123-00', telefone: '(43) 99623-4567', cidade: 'Cambé', tipo: 'PF' },
    { id: 'c4', nome: 'Transportes Rápido Ltda', cpf_cnpj: '12.345.678/0001-90', telefone: '(43) 3234-5678', cidade: 'Londrina', tipo: 'PJ' },
  ];

  const mockLancamentos = [
    { id: 'l1', tipo: 'receita', descricao: 'Transferência - João Paulo', valor: 280, data_vencimento: '2024-03-15', status: 'pago', forma_pagamento: 'pix', cliente_nome: 'João Paulo' },
    { id: 'l2', tipo: 'receita', descricao: 'Licenciamento - Maria Santos', valor: 120, data_vencimento: '2024-03-20', status: 'pago', forma_pagamento: 'dinheiro', cliente_nome: 'Maria Santos' },
    { id: 'l3', tipo: 'receita', descricao: 'Emplacamento - Roberto Lima', valor: 350, data_vencimento: '2024-03-25', status: 'pendente', cliente_nome: 'Roberto Lima' },
    { id: 'l4', tipo: 'receita', descricao: 'Vistoria - Ana Beatriz', valor: 150, data_vencimento: '2024-03-01', status: 'atrasado', cliente_nome: 'Ana Beatriz' },
    { id: 'l5', tipo: 'despesa', descricao: 'Aluguel do escritório', valor: 1200, data_vencimento: '2024-03-30', status: 'pendente' },
    { id: 'l6', tipo: 'despesa', descricao: 'Internet e telefone', valor: 250, data_vencimento: '2024-03-25', status: 'pendente' },
  ];

  return {
    window: {
      minimize: () => {}, maximize: () => {}, close: () => {},
    },
    auth: {
      login: async ({ email, senha }) => {
        if (email === 'admin@despachapr.com' && senha === 'admin123') {
          return { success: true, token: 'mock-token', usuario: { id: '1', nome: 'Carlos Silva', email, perfil: 'admin' } };
        }
        return { success: false, error: 'Credenciais inválidas' };
      },
      logout: async () => ({ success: true }),
      verify: async (token) => token === 'mock-token' ? { valid: true, usuario: { id: '1', nome: 'Carlos Silva', email: 'admin@despachapr.com', perfil: 'admin' } } : { valid: false },
    },
    crm: {
      getLeads: async () => ({ success: true, data: mockLeads }),
      createLead: async (d) => { mockLeads.push({ id: Date.now().toString(), ...d }); return { success: true }; },
      updateLead: async () => ({ success: true }),
      moveLead: async () => ({ success: true }),
      deleteLead: async () => ({ success: true }),
      getLeadHistory: async () => ({ success: true, data: [] }),
      addInteraction: async () => ({ success: true }),
      convertToClient: async () => ({ success: true, clienteId: 'new-' + Date.now() }),
      getClients: async () => ({ success: true, data: mockClientes }),
      getClient: async (id) => ({ success: true, data: { ...mockClientes.find(c => c.id === id), processos: [] } }),
      updateClient: async () => ({ success: true }),
      search: async (q) => ({ success: true, data: mockClientes.filter(c => c.nome.toLowerCase().includes(q.toLowerCase())).slice(0,5).map(c => ({ ...c, tipo: 'cliente' })) }),
    },
    processo: {
      list: async () => ({ success: true, data: [] }),
      create: async () => ({ success: true }),
      update: async () => ({ success: true }),
    },
    docs: {
      upload: async () => ({ success: true }),
      list: async () => ({ success: true, data: [] }),
      delete: async () => ({ success: true }),
      updateStatus: async () => ({ success: true }),
      open: async () => {},
      selectFile: async () => 'mock/path/file.pdf',
    },
    financeiro: {
      getContasReceber: async () => ({ success: true, data: mockLancamentos.filter(l => l.tipo === 'receita') }),
      getContasPagar: async () => ({ success: true, data: mockLancamentos.filter(l => l.tipo === 'despesa') }),
      createLancamento: async () => ({ success: true }),
      updateLancamento: async () => ({ success: true }),
      registrarPagamento: async () => ({ success: true }),
      getFluxoCaixa: async () => ({ success: true, data: [] }),
      getInadimplentes: async () => ({ success: true, data: mockLancamentos.filter(l => l.status === 'atrasado') }),
      getDashboard: async () => ({ success: true, data: { totalReceber: 530, totalPagar: 1450, receitaMes: 4820, despesaMes: 1530, inadimplentes: 1, saldoMes: 3290 } }),
    },
    caixa: {
      abrir: async () => ({ success: true }),
      fechar: async () => ({ success: true }),
      getAtual: async () => ({ success: true, data: { id: 'cx1', status: 'aberto', valor_inicial: 200, data_abertura: new Date().toISOString() } }),
      addMovimento: async () => ({ success: true }),
      getMovimentos: async () => ({ success: true, data: [
        { id: 'm1', tipo: 'entrada', descricao: 'Transferência - João Paulo', valor: 280, forma_pagamento: 'pix', criado_em: new Date().toISOString() },
        { id: 'm2', tipo: 'entrada', descricao: 'Licenciamento - Maria Santos', valor: 120, forma_pagamento: 'dinheiro', criado_em: new Date().toISOString() },
      ]}),
      getHistorico: async () => ({ success: true, data: [] }),
    },
    nf: {
      emitir: async () => ({ success: true }),
      list: async () => ({ success: true, data: [] }),
      cancelar: async () => ({ success: true }),
      getServicos: async () => ({ success: true, data: [
        { id: 's1', nome: 'Transferência de Veículo', valor_padrao: 280, codigo_servico_nf: '7319' },
        { id: 's2', nome: 'Licenciamento Anual', valor_padrao: 120, codigo_servico_nf: '7319' },
      ]}),
      openPDF: async () => {},
    },
    relatorios: {
      dashboard: async () => ({ success: true, data: {
        vendasMes: [
          { mes: 'Out', valor: 3200 }, { mes: 'Nov', valor: 4100 }, { mes: 'Dez', valor: 3800 },
          { mes: 'Jan', valor: 4500 }, { mes: 'Fev', valor: 3900 }, { mes: 'Mar', valor: 4820 },
        ],
        servicosTop: [
          { nome: 'Transferência', total: 12, valor: 3360 },
          { nome: 'Licenciamento', total: 18, valor: 2160 },
          { nome: 'Emplacamento', total: 5, valor: 1750 },
          { nome: 'CNH 2ª via', total: 7, valor: 1260 },
        ],
        leadsConversao: { total: 45, fechados: 28, taxa: 62 },
      }}),
      vendas: async () => ({ success: true, data: [] }),
      conversao: async () => ({ success: true, data: [] }),
      receitaMensal: async () => ({ success: true, data: [] }),
      servicosMaisVendidos: async () => ({ success: true, data: [] }),
      exportExcel: async () => ({ success: true }),
      exportPDF: async () => ({ success: true }),
    },
    whatsapp: {
      init: async () => ({ success: true }),
      sendMessage: async () => ({ success: true }),
      getTemplates: async () => ({ success: true, data: [] }),
      getStatus: async () => ({ success: true, status: 'disconnected' }),
      disconnect: async () => ({ success: true }),
      onQR: () => {},
      onReady: () => {},
      onMessage: () => {},
    },
    system: { backup: async () => ({ success: true }) },
    notifications: {
      getAll: async () => ({ success: true, data: [
        { id: 'n1', tipo: 'alerta', titulo: 'Contas em Atraso', mensagem: '1 conta a receber atrasada', lida: 0, criado_em: new Date().toISOString() },
        { id: 'n2', tipo: 'info', titulo: 'Novo Lead', mensagem: 'Lucas Martins via WhatsApp', lida: 0, criado_em: new Date().toISOString() },
      ]}),
      markRead: async () => ({ success: true }),
      onNew: () => {},
    },
  };
}

// Expose mock API globally
window._api = api;
export { api };

// ─── Pages map ──────────────────────────────────────────────────
const PAGES = {
  dashboard: Dashboard,
  crm: CRMPage,
  clientes: ClientesPage,
  financeiro: FinanceiroPage,
  caixa: CaixaPage,
  documentos: DocumentosPage,
  notas: NotasFiscaisPage,
  relatorios: RelatoriosPage,
  whatsapp: WhatsAppPage,
  config: ConfigPage,
};

// ─── App root ────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  // Check persisted session
  useEffect(() => {
    const token = localStorage.getItem('dp_token');
    if (token) {
      api.auth.verify(token).then(res => {
        if (res.valid) setSession({ token, usuario: res.usuario });
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  };

  const handleLogin = (sessionData) => {
    localStorage.setItem('dp_token', sessionData.token);
    setSession(sessionData);
  };

  const handleLogout = async () => {
    await api.auth.logout(session.token);
    localStorage.removeItem('dp_token');
    setSession(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0e0f11' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#f0a500' }}>DespachaPR</div>
          <div style={{ color: '#4a4f5c', fontSize: 13 }}>Carregando...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <ToastContext.Provider value={addToast}>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer toasts={toasts} />
      </ToastContext.Provider>
    );
  }

  const PageComponent = PAGES[currentPage] || Dashboard;

  return (
    <AuthContext.Provider value={{ session, logout: handleLogout }}>
      <ToastContext.Provider value={addToast}>
        <NavContext.Provider value={{ currentPage, navigate: setCurrentPage }}>
          <Shell>
            <PageComponent />
          </Shell>
          <ToastContainer toasts={toasts} />
        </NavContext.Provider>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}
