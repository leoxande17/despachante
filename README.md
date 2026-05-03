# DespachaPR — Sistema de Gestão para Despachante de Veículos

Sistema desktop completo para escritórios de despachante no estado do Paraná (Brasil).
Aplicação Electron offline-first com backend embutido e banco de dados SQLite.

---

## 🚀 Instalação Rápida

### Pré-requisitos
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **Windows 10/11** (x64)

### Passos

```bash
# 1. Clonar/descompactar o projeto
cd despachante-main

# 2. Instalar dependências
npm install

# 3. Inicializar banco de dados (instalação limpa - SEM dados mockados)
npm run db:init

# 4. Rodar em desenvolvimento
npm run dev

# 5. Gerar instalador Windows (.exe)
npm run build:win
```

O instalador será gerado em `dist/DespachaPR Setup 1.0.0.exe`.

**Para instalar:** Execute o arquivo `.exe` gerado e siga o assistente de instalação. O aplicativo será instalado com atalhos na área de trabalho e menu iniciar.

---

## 🗄️ Banco de Dados

### Localização
O banco de dados SQLite é criado automaticamente na primeira execução em:
- **Windows:** `%APPDATA%/DespachaPR/data/despachapr.db`

### Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run db:init` | Inicializa o banco com estrutura vazia (apenas usuário admin) |
| `npm run db:seed` | Popula com dados de exemplo para testes |

### Estrutura do Banco
O sistema utiliza migrações automáticas que criam as seguintes tabelas:
- `usuarios` - Cadastro de usuários do sistema
- `clientes` - Cadastro de clientes
- `processos` - Processos de despachante
- `lancamentos` - Financeiro (contas a pagar/receber)
- `caixas` - Controle de caixa
- `documentos` - Arquivos digitalizados
- `servicos_catalogo` - Catálogo de serviços
- `whatsapp_templates` - Templates de mensagem
- `notas_fiscais` - Notas fiscais emitidas
- `schema_version` - Controle de migrações

### Primeira Execução
1. Execute `npm run db:init` para criar o banco limpo
2. Execute `npm run dev` para iniciar o aplicativo
3. Faça login com as credenciais abaixo
4. Altere a senha padrão imediatamente

---

## 🔐 Credenciais Padrão

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@despachapr.com | admin123 |

> ⚠️ **Importante:** Altere a senha após o primeiro acesso em **Configurações → Segurança**

---

## 📁 Estrutura do Projeto

```
despacha-pr/
├── src/
│   ├── main/                    # Processo principal Electron (Node.js)
│   │   ├── main.js              # Ponto de entrada + IPC handlers
│   │   ├── preload.js           # Bridge segura renderer ↔ main
│   │   └── services/
│   │       ├── database.js      # SQLite + migrations
│   │       ├── auth.js          # Autenticação + sessões
│   │       ├── crm.js           # Leads, clientes, processos
│   │       ├── financeiro.js    # Contas a pagar/receber
│   │       ├── caixa.js         # Controle de caixa
│   │       ├── documentos.js    # Upload e gestão de docs
│   │       ├── notafiscal.js    # Integração NFS-e Ibiporã
│   │       ├── relatorios.js    # Relatórios + export Excel/PDF
│   │       ├── whatsapp.js      # Integração WhatsApp (Baileys)
│   │       └── log.js           # Sistema de logs
│   └── renderer/                # Interface React (frontend)
│       ├── App.jsx              # Root + contextos + mock API
│       ├── main.jsx             # Entry point React
│       ├── styles/global.css    # Design system + tema dark
│       ├── components/
│       │   ├── Shell.jsx        # Layout (sidebar + topbar)
│       │   ├── Icon.jsx         # Ícones SVG inline
│       │   └── ToastContainer.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── Dashboard.jsx
│           ├── CRMPage.jsx      # Kanban drag & drop
│           ├── ClientesPage.jsx
│           ├── FinanceiroPage.jsx
│           ├── CaixaPage.jsx
│           ├── DocumentosPage.jsx
│           ├── NotasFiscaisPage.jsx
│           ├── RelatoriosPage.jsx
│           ├── WhatsAppPage.jsx
│           └── ConfigPage.jsx
├── scripts/
│   └── seed.js                  # Dados de exemplo
├── package.json
├── vite.config.js
└── README.md
```

---

## 🧩 Módulos

| Módulo | Funcionalidades |
|--------|----------------|
| **Dashboard** | KPIs, gráfico de receita, leads recentes, taxa de conversão |
| **Funil de Vendas** | Kanban drag & drop, 6 etapas, histórico de interações |
| **Clientes** | Cadastro PF/PJ, máscaras CPF/CNPJ, busca por CEP automática |
| **Financeiro** | Contas a receber/pagar, registro de pagamento, inadimplência |
| **Caixa** | Abertura/fechamento, entradas/saídas, conferência diária |
| **Documentos** | Upload, organização por cliente, aprovação/rejeição |
| **Nota Fiscal** | NFS-e Prefeitura de Ibiporã, cálculo ISS, XML/PDF local |
| **WhatsApp** | Conexão via QR, envio de mensagens, templates, fluxos automáticos |
| **Relatórios** | Vendas por período, conversão, serviços top, export Excel/PDF |
| **Configurações** | Dados da empresa, NFS-e, usuários, backup, senha |

---

## ⚙️ Configuração da Nota Fiscal (NFS-e)

1. Acesse **Configurações → Nota Fiscal**
2. Preencha:
   - URL da API (fornecida pela Prefeitura de Ibiporã)
   - Token de acesso
   - CNPJ do prestador
   - Código de tributação (padrão: 7319)
3. Salve e teste com uma emissão de valor baixo

> Sem as credenciais configuradas, o sistema opera em **modo simulado** (sem envio real).

---

## 💬 WhatsApp

A integração usa a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys):

```bash
npm install @whiskeysockets/baileys
```

Após instalar:
1. Vá em **WhatsApp** no menu lateral
2. Clique em **Conectar WhatsApp**
3. Escaneie o QR Code com o app do WhatsApp

---

## 💾 Backup

- **Manual**: Configurações → Backup → Gerar Backup Agora
- Gera arquivo `.zip` com banco de dados + documentos
- Recomendado: backup diário em pasta de rede ou pendrive

---

## 🔒 Segurança

- Autenticação local com hash bcrypt (salt rounds = 10)
- Sessões com expiração de 8 horas
- Isolamento contextual (contextIsolation: true, nodeIntegration: false)
- Dados armazenados em `%APPDATA%/despacha-pr/`

---

## 🛠️ Desenvolvimento

```bash
# Dev com hot-reload
npm run dev

# Build de produção
npm run build

# Gerar instalador Windows
npm run build:win

# Reiniciar banco de dados
npm run db:seed
```

### Variáveis de ambiente (arquivo `.env`)
```
NFS_API_URL=https://nfse.ibipor.pr.gov.br/api
NFS_TOKEN=seu_token_aqui
NODE_ENV=development
```

---

## 📞 Suporte

Sistema desenvolvido para uso interno. Para dúvidas técnicas, consulte o desenvolvedor responsável.

---

*DespachaPR v1.0 · Electron + React + SQLite · Offline-first · Ibiporã, Paraná*
