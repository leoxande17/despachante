// scripts/seed.js - Dados de exemplo para demonstração
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../database/despachapr.db');
const db = new Database(DB_PATH);

async function seed() {
  console.log('🌱 Iniciando seed de dados...');

  // Usuários
  const adminHash = await bcrypt.hash('admin123', 10);
  const opHash = await bcrypt.hash('operador123', 10);
  
  const adminId = uuidv4();
  const opId = uuidv4();

  db.prepare(`
    INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash, perfil)
    VALUES (?, 'Carlos Silva - Admin', 'admin@despachapr.com', ?, 'admin')
  `).run(adminId, adminHash);

  db.prepare(`
    INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash, perfil)
    VALUES (?, 'Fernanda Oliveira', 'fernanda@despachapr.com', ?, 'operador')
  `).run(opId, opHash);

  // Serviços do catálogo
  const servicos = [
    { id: uuidv4(), nome: 'Transferência de Veículo', valor: 280.00, codigo: '7319' },
    { id: uuidv4(), nome: 'Licenciamento Anual', valor: 120.00, codigo: '7319' },
    { id: uuidv4(), nome: 'Emplacamento Novo', valor: 350.00, codigo: '7319' },
    { id: uuidv4(), nome: 'CRLV Digital', valor: 80.00, codigo: '7319' },
    { id: uuidv4(), nome: 'Regularização de Débitos', valor: 200.00, codigo: '7319' },
    { id: uuidv4(), nome: 'Vistoria Veicular', valor: 150.00, codigo: '7319' },
    { id: uuidv4(), nome: '2ª via de CNH', valor: 180.00, codigo: '7319' },
    { id: uuidv4(), nome: 'Adição de Categoria CNH', valor: 95.00, codigo: '7319' },
  ];

  for (const s of servicos) {
    db.prepare(`
      INSERT OR IGNORE INTO servicos_catalogo (id, nome, valor_padrao, codigo_servico_nf)
      VALUES (?, ?, ?, ?)
    `).run(s.id, s.nome, s.valor, s.codigo);
  }

  // Clientes
  const clientes = [
    { id: uuidv4(), nome: 'João Paulo Ferreira', cpf: '123.456.789-00', tel: '(43) 99801-2345', cidade: 'Ibiporã' },
    { id: uuidv4(), nome: 'Maria Santos da Costa', cpf: '987.654.321-00', tel: '(43) 99712-8901', cidade: 'Londrina' },
    { id: uuidv4(), nome: 'Roberto Almeida Lima', cpf: '456.789.123-00', tel: '(43) 99623-4567', cidade: 'Cambé' },
    { id: uuidv4(), nome: 'Ana Beatriz Rodrigues', cpf: '789.123.456-00', tel: '(43) 99534-9012', cidade: 'Ibiporã' },
    { id: uuidv4(), nome: 'Transportes Rápido Ltda', cpf: '12.345.678/0001-90', tel: '(43) 3234-5678', cidade: 'Londrina' },
  ];

  for (const c of clientes) {
    db.prepare(`
      INSERT OR IGNORE INTO clientes (id, nome, cpf_cnpj, telefone, whatsapp, cidade, estado)
      VALUES (?, ?, ?, ?, ?, ?, 'PR')
    `).run(c.id, c.nome, c.cpf, c.tel, c.tel, c.cidade);
  }

  // Leads no Kanban
  const etapas = ['novo', 'em_atendimento', 'proposta', 'negociacao', 'fechado', 'perdido'];
  const origens = ['whatsapp', 'indicacao', 'instagram', 'google', 'manual'];
  const leadNames = [
    'Lucas Martins', 'Camila Pereira', 'Diego Santos', 'Patricia Lima',
    'Marcos Souza', 'Juliana Costa', 'Felipe Oliveira', 'Amanda Rodrigues',
    'Bruno Ferreira', 'Larissa Alves', 'Thiago Nascimento', 'Gabriela Mendes'
  ];

  leadNames.forEach((nome, i) => {
    db.prepare(`
      INSERT OR IGNORE INTO leads (id, nome, telefone, whatsapp, origem, etapa,
        servico_interesse, veiculo_placa, valor_estimado, responsavel_id, posicao_kanban)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), nome,
      `(43) 99${String(i).padStart(3,'0')}-${String(1000+i).padStart(4,'0')}`,
      `(43) 99${String(i).padStart(3,'0')}-${String(1000+i).padStart(4,'0')}`,
      origens[i % origens.length],
      etapas[Math.floor(i / 2) % etapas.length],
      servicos[i % servicos.length].nome,
      `ABC${String(1000+i).padStart(4,'0')}`,
      servicos[i % servicos.length].valor,
      i % 2 === 0 ? adminId : opId,
      (i % 2) + 1
    );
  });

  // Processos
  const processos = [];
  clientes.forEach((c, i) => {
    const proc = {
      id: uuidv4(),
      numero: `2024-${String(i+1).padStart(4,'0')}`,
      cliente_id: c.id,
      servico_id: servicos[i % servicos.length].id,
      placa: `ABX-${String(1000+i).padStart(4,'0')}`,
      status: ['aberto', 'em_andamento', 'concluido'][i % 3],
      valor: servicos[i % servicos.length].valor,
    };
    processos.push(proc);

    db.prepare(`
      INSERT OR IGNORE INTO processos (id, numero, cliente_id, servico_id, veiculo_placa,
        status, descricao, valor, responsavel_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proc.id, proc.numero, proc.cliente_id, proc.servico_id, proc.placa,
      proc.status, `Processo de ${servicos[i % servicos.length].nome}`, proc.valor, adminId
    );
  });

  // Lançamentos financeiros
  const hoje = new Date();
  const lancamentos = [
    // Receitas pagas
    { tipo: 'receita', cat: 'Serviços', desc: 'Processo 2024-0001 - Transferência', val: 280, dias: -5, status: 'pago', fpag: 'pix' },
    { tipo: 'receita', cat: 'Serviços', desc: 'Processo 2024-0002 - Licenciamento', val: 120, dias: -3, status: 'pago', fpag: 'dinheiro' },
    { tipo: 'receita', cat: 'Serviços', desc: 'Processo 2024-0003 - Emplacamento', val: 350, dias: -1, status: 'pago', fpag: 'cartao_debito' },
    // Receitas pendentes
    { tipo: 'receita', cat: 'Serviços', desc: 'Processo 2024-0004 - CRLV Digital', val: 80, dias: 5, status: 'pendente' },
    { tipo: 'receita', cat: 'Serviços', desc: 'Processo 2024-0005 - Regularização', val: 200, dias: 10, status: 'pendente' },
    // Receitas atrasadas
    { tipo: 'receita', cat: 'Serviços', desc: 'João Paulo - Vistoria', val: 150, dias: -10, status: 'atrasado' },
    // Despesas
    { tipo: 'despesa', cat: 'Aluguel', desc: 'Aluguel do escritório', val: 1200, dias: 5, status: 'pendente' },
    { tipo: 'despesa', cat: 'Utilities', desc: 'Internet e telefone', val: 250, dias: 3, status: 'pendente' },
    { tipo: 'despesa', cat: 'Material', desc: 'Material de escritório', val: 80, dias: -2, status: 'pago', fpag: 'dinheiro' },
    { tipo: 'despesa', cat: 'Software', desc: 'Assinatura sistemas DETRAN', val: 150, dias: 15, status: 'pendente' },
  ];

  lancamentos.forEach(l => {
    const data = new Date(hoje);
    data.setDate(data.getDate() + l.dias);
    const dataStr = data.toISOString().slice(0,10);
    const pagamento = l.status === 'pago' ? dataStr : null;

    db.prepare(`
      INSERT INTO lancamentos (id, tipo, categoria, descricao, valor, data_vencimento,
        status, forma_pagamento, data_pagamento, cliente_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), l.tipo, l.cat, l.desc, l.val, dataStr,
      l.status, l.fpag || null, pagamento,
      l.tipo === 'receita' ? clientes[0].id : null
    );
  });

  // Caixa aberto
  const caixaId = uuidv4();
  db.prepare(`
    INSERT INTO caixas (id, usuario_id, data_abertura, valor_inicial, status)
    VALUES (?, ?, datetime('now'), 200.00, 'aberto')
  `).run(caixaId, adminId);

  db.prepare(`
    INSERT INTO caixa_movimentos (id, caixa_id, tipo, descricao, valor, forma_pagamento)
    VALUES (?, ?, 'entrada', 'Transferência - João Paulo', 280.00, 'pix')
  `).run(uuidv4(), caixaId);

  db.prepare(`
    INSERT INTO caixa_movimentos (id, caixa_id, tipo, descricao, valor, forma_pagamento)
    VALUES (?, ?, 'entrada', 'Licenciamento - Maria Santos', 120.00, 'dinheiro')
  `).run(uuidv4(), caixaId);

  // Templates WhatsApp
  const templates = [
    {
      nome: 'Boas-vindas',
      categoria: 'atendimento',
      mensagem: 'Olá, {{nome}}! 👋 Bem-vindo ao DespachaPR! Sou o(a) {{atendente}} e estou aqui para te ajudar. Qual serviço você precisa hoje?'
    },
    {
      nome: 'Coleta de Dados',
      categoria: 'atendimento',
      mensagem: 'Para prosseguir com seu atendimento, preciso de algumas informações:\n1. Nome completo\n2. CPF\n3. Placa do veículo\n4. Serviço desejado'
    },
    {
      nome: 'Proposta de Serviço',
      categoria: 'comercial',
      mensagem: 'Olá, {{nome}}! Segue a proposta para {{servico}}:\n💰 Valor: R$ {{valor}}\n📋 Prazo estimado: {{prazo}}\n\nGostaria de prosseguir?'
    },
    {
      nome: 'Confirmação de Pagamento',
      categoria: 'financeiro',
      mensagem: 'Pagamento confirmado! ✅\nServiço: {{servico}}\nValor: R$ {{valor}}\nProcesso nº: {{processo}}\nObrigado pela confiança!'
    },
    {
      nome: 'Lembrete de Vencimento',
      categoria: 'cobrança',
      mensagem: 'Olá, {{nome}}! 📅 Seu licenciamento vence em {{data}}. Já providenciou o pagamento? Posso te ajudar a regularizar!'
    },
  ];

  templates.forEach(t => {
    db.prepare(`
      INSERT INTO whatsapp_templates (id, nome, categoria, mensagem)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), t.nome, t.categoria, t.mensagem);
  });

  // Notificações
  db.prepare(`
    INSERT INTO notificacoes (id, tipo, titulo, mensagem)
    VALUES (?, 'alerta', 'Lançamentos em Atraso', '3 contas a receber estão atrasadas')
  `).run(uuidv4());
  
  db.prepare(`
    INSERT INTO notificacoes (id, tipo, titulo, mensagem)
    VALUES (?, 'info', 'Novo Lead', 'Lucas Martins entrou em contato via WhatsApp')
  `).run(uuidv4());

  console.log('✅ Seed concluído com sucesso!');
  console.log('   👤 Admin: admin@despachapr.com / admin123');
  console.log('   👤 Operador: fernanda@despachapr.com / operador123');

  db.close();
}

seed().catch(console.error);
