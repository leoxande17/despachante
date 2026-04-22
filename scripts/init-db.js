// scripts/init-db.js
// Inicialização do banco de dados para instalação limpa
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../database');
const DB_PATH = path.join(DB_DIR, 'despachapr.db');

async function init() {
  console.log('🔧 Inicializando banco de dados DespachaPR...');

  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Criar todas as tabelas (schema v1)
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

  // Admin padrão
  const adminHash = await bcrypt.hash('admin123', 10);
  db.prepare(`
    INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash, perfil)
    VALUES (?, 'Administrador', 'admin@despachapr.com', ?, 'admin')
  `).run(uuidv4(), adminHash);

  // Serviços padrão
  const servicos = [
    ['Transferência de Veículo', 280.00, '7319'],
    ['Licenciamento Anual', 120.00, '7319'],
    ['Emplacamento Novo', 350.00, '7319'],
    ['CRLV Digital', 80.00, '7319'],
    ['Regularização de Débitos', 200.00, '7319'],
    ['Vistoria Veicular', 150.00, '7319'],
    ['2ª Via de CNH', 180.00, '7319'],
    ['Adição de Categoria CNH', 95.00, '7319'],
    ['Habilitação Nacional', 250.00, '7319'],
    ['Renovação de CNH', 130.00, '7319'],
  ];

  const insertServico = db.prepare(
    'INSERT OR IGNORE INTO servicos_catalogo (id, nome, valor_padrao, codigo_servico_nf) VALUES (?, ?, ?, ?)'
  );
  for (const [nome, valor, codigo] of servicos) {
    insertServico.run(uuidv4(), nome, valor, codigo);
  }

  // Templates WhatsApp
  const templates = [
    ['Boas-vindas', 'atendimento', 'Olá, {{nome}}! 👋 Seja bem-vindo(a) ao DespachaPR!\n\nSou {{atendente}} e estou aqui para te ajudar. Com qual serviço posso te auxiliar hoje?\n\n🚗 Transferência de veículo\n📋 Licenciamento\n🪪 CNH\n📄 CRLV\n📌 Outro'],
    ['Coleta de Dados', 'atendimento', 'Para iniciarmos seu atendimento, preciso de algumas informações:\n\n1️⃣ Nome completo\n2️⃣ CPF\n3️⃣ Placa do veículo (se houver)\n4️⃣ Descrição do serviço desejado\n\nResponda com os dados acima que verifico para você! 😊'],
    ['Proposta', 'comercial', 'Olá, {{nome}}! 🤝\n\nSegue proposta para o serviço:\n\n📋 Serviço: {{servico}}\n💰 Valor: R$ {{valor}}\n⏱ Prazo: {{prazo}}\n\nGostaria de prosseguir? Posso agendar para você!'],
    ['Confirmar Pagamento', 'financeiro', 'Pagamento confirmado! ✅\n\n📋 Serviço: {{servico}}\n💰 Valor: R$ {{valor}}\n🔢 Processo nº: {{processo}}\n\nVou processar e te aviso sobre o andamento. Obrigado pela confiança! 🙏'],
    ['Andamento', 'processo', 'Olá, {{nome}}! 📬\n\nAtualização do seu processo nº {{processo}}:\n\n✅ Status: {{status}}\n📅 Previsão: {{prazo}}\n\nQualquer dúvida, estou à disposição!'],
    ['Lembrete Licenciamento', 'cobrança', 'Olá, {{nome}}! ⚠️\n\nSeu licenciamento vence em {{data}}. Evite multas e irregularidades!\n\nPosso te ajudar a regularizar de forma rápida e sem sair de casa.\n\nResponda SIM para iniciar o processo!'],
  ];

  const insertTemplate = db.prepare(
    'INSERT OR IGNORE INTO whatsapp_templates (id, nome, categoria, mensagem) VALUES (?, ?, ?, ?)'
  );
  for (const [nome, cat, msg] of templates) {
    insertTemplate.run(uuidv4(), nome, cat, msg);
  }

  db.close();
  console.log('✅ Banco de dados inicializado com sucesso!');
  console.log('   📧 Login: admin@despachapr.com');
  console.log('   🔑 Senha: admin123');
  console.log('   ⚠️  Altere a senha após o primeiro acesso!');
}

init().catch(err => {
  console.error('❌ Erro na inicialização:', err);
  process.exit(1);
});
