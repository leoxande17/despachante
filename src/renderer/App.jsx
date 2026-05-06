// src/renderer/App.jsx — Stateful Mock API + Contexts
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

export const AuthContext  = createContext(null);
export const ToastContext = createContext(null);
export const NavContext   = createContext(null);
export const useAuth  = () => useContext(AuthContext);
export const useToast = () => useContext(ToastContext);
export const useNav   = () => useContext(NavContext);

const genId = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36);

function createMockAPI() {
  let leads = [
    {id:'1',nome:'Lucas Martins',    telefone:'(43) 99801-2345',whatsapp:'(43) 99801-2345',origem:'whatsapp',  etapa:'novo',          servico_interesse:'Transferência',valor_estimado:280,posicao_kanban:1},
    {id:'2',nome:'Camila Pereira',   telefone:'(43) 99712-8901',whatsapp:'(43) 99712-8901',origem:'indicacao', etapa:'em_atendimento', servico_interesse:'Licenciamento', valor_estimado:120,posicao_kanban:1},
    {id:'3',nome:'Diego Santos',     telefone:'(43) 99623-4567',whatsapp:'(43) 99623-4567',origem:'instagram', etapa:'proposta',       servico_interesse:'Emplacamento',  valor_estimado:350,posicao_kanban:1},
    {id:'4',nome:'Patricia Lima',    telefone:'(43) 99534-9012',whatsapp:'(43) 99534-9012',origem:'google',    etapa:'negociacao',     servico_interesse:'Transferência', valor_estimado:280,posicao_kanban:1},
    {id:'5',nome:'Marcos Souza',     telefone:'(43) 99401-3456',whatsapp:'(43) 99401-3456',origem:'whatsapp',  etapa:'fechado',        servico_interesse:'CNH',           valor_estimado:180,posicao_kanban:1},
    {id:'6',nome:'Juliana Costa',    telefone:'(43) 99312-7890',whatsapp:'(43) 99312-7890',origem:'manual',    etapa:'perdido',        servico_interesse:'Vistoria',      valor_estimado:150,posicao_kanban:1,motivo_perda:'Preço'},
    {id:'7',nome:'Felipe Oliveira',  telefone:'(43) 99234-5678',whatsapp:'(43) 99234-5678',origem:'whatsapp',  etapa:'novo',           servico_interesse:'CRLV',          valor_estimado:80, posicao_kanban:2},
    {id:'8',nome:'Amanda Rodrigues', telefone:'(43) 99145-6789',whatsapp:'(43) 99145-6789',origem:'indicacao', etapa:'em_atendimento', servico_interesse:'Regularização', valor_estimado:200,posicao_kanban:2},
  ];
  let clientes = [
    {id:'c1',nome:'João Paulo Ferreira',   cpf_cnpj:'123.456.789-00',rg:'12.345.678-9',telefone:'(43) 99801-2345',whatsapp:'(43) 99801-2345',email:'joao@email.com', cidade:'Ibiporã', estado:'PR',tipo:'PF',logradouro:'Rua das Flores',numero:'100',bairro:'Centro',cep:'86200-000'},
    {id:'c2',nome:'Maria Santos da Costa', cpf_cnpj:'987.654.321-00',rg:'98.765.432-1',telefone:'(43) 99712-8901',whatsapp:'(43) 99712-8901',email:'maria@email.com',cidade:'Londrina',estado:'PR',tipo:'PF'},
    {id:'c3',nome:'Roberto Almeida Lima',  cpf_cnpj:'456.789.123-00',rg:'45.678.912-3',telefone:'(43) 99623-4567',whatsapp:'(43) 99623-4567',email:'',              cidade:'Cambé',   estado:'PR',tipo:'PF'},
    {id:'c4',nome:'Transportes Rápido Ltda',cpf_cnpj:'12.345.678/0001-90',            telefone:'(43) 3234-5678', whatsapp:'',                email:'ti@transr.com', cidade:'Londrina',estado:'PR',tipo:'PJ'},
  ];
  let processos = [
    {id:'p1',numero:'2024-0001',cliente_id:'c1',servico_id:'s1',servico_nome:'Transferência de Veículo',veiculo_placa:'ABX-1234',status:'em_andamento',valor:280},
    {id:'p2',numero:'2024-0002',cliente_id:'c2',servico_id:'s2',servico_nome:'Licenciamento Anual',    veiculo_placa:'KLM-5678',status:'aberto',       valor:120},
    {id:'p3',numero:'2024-0003',cliente_id:'c3',servico_id:'s3',servico_nome:'Emplacamento Novo',      veiculo_placa:'XYZ-9012',status:'concluido',    valor:350},
  ];
  let lancamentos = [
    {id:'l1',tipo:'receita',categoria:'Serviços de Despachante',descricao:'Transferência - João Paulo', valor:280,data_vencimento:'2025-03-15',status:'pago',   forma_pagamento:'pix',     data_pagamento:'2025-03-15',cliente_id:'c1',cliente_nome:'João Paulo Ferreira'},
    {id:'l2',tipo:'receita',categoria:'Serviços de Despachante',descricao:'Licenciamento - Maria Santos',valor:120,data_vencimento:'2025-03-20',status:'pago',   forma_pagamento:'dinheiro',data_pagamento:'2025-03-20',cliente_id:'c2',cliente_nome:'Maria Santos da Costa'},
    {id:'l3',tipo:'receita',categoria:'Serviços de Despachante',descricao:'Emplacamento - Roberto Lima', valor:350,data_vencimento:'2025-04-25',status:'pendente',cliente_id:'c3',cliente_nome:'Roberto Almeida Lima'},
    {id:'l4',tipo:'receita',categoria:'Serviços de Despachante',descricao:'Vistoria - Ana Beatriz',      valor:150,data_vencimento:'2025-03-01',status:'atrasado',cliente_id:'c1',cliente_nome:'Ana Beatriz'},
    {id:'l5',tipo:'despesa',categoria:'Aluguel',                descricao:'Aluguel do escritório',       valor:1200,data_vencimento:'2025-04-30',status:'pendente'},
    {id:'l6',tipo:'despesa',categoria:'Utilities',              descricao:'Internet e telefone',         valor:250, data_vencimento:'2025-04-25',status:'pendente'},
  ];
  let caixaAtual = {id:'cx1',status:'aberto',valor_inicial:200,data_abertura:new Date().toISOString(),usuario_nome:'Carlos Silva'};
  let movimentos = [
    {id:'m1',caixa_id:'cx1',tipo:'entrada',descricao:'Transferência - João Paulo', valor:280,forma_pagamento:'pix',    criado_em:new Date().toISOString()},
    {id:'m2',caixa_id:'cx1',tipo:'entrada',descricao:'Licenciamento - Maria Santos',valor:120,forma_pagamento:'dinheiro',criado_em:new Date().toISOString()},
  ];
  let historicoCaixas = [];
  let documentos = [];
  let notasFiscais = [];
  let interacoes = [];
  let usuarios = [
    {id:'u1',nome:'Carlos Silva',    email:'admin@despachapr.com',  perfil:'admin',   ativo:1,permissoes:['all']},
    {id:'u2',nome:'Fernanda Oliveira',email:'fernanda@despachapr.com',perfil:'operador',ativo:1,permissoes:['crm','clientes','documentos','financeiro']},
  ];
  const SERVICOS_CATALOGO = [
    {id:'s1',nome:'Transferência de Veículo', valor_padrao:280,codigo_servico_nf:'7319'},
    {id:'s2',nome:'Licenciamento Anual',      valor_padrao:120,codigo_servico_nf:'7319'},
    {id:'s3',nome:'Emplacamento Novo',        valor_padrao:350,codigo_servico_nf:'7319'},
    {id:'s4',nome:'CRLV Digital',             valor_padrao:80, codigo_servico_nf:'7319'},
    {id:'s5',nome:'Regularização de Débitos', valor_padrao:200,codigo_servico_nf:'7319'},
    {id:'s6',nome:'Vistoria Veicular',        valor_padrao:150,codigo_servico_nf:'7319'},
    {id:'s7',nome:'2ª Via de CNH',            valor_padrao:180,codigo_servico_nf:'7319'},
    {id:'s8',nome:'Adição de Categoria CNH',  valor_padrao:95, codigo_servico_nf:'7319'},
  ];

  return {
    window:{minimize:()=>{},maximize:()=>{},close:()=>{}},
    auth:{
      login:async({email,senha})=>{
        if(email==='admin@despachapr.com'&&senha==='admin123')return{success:true,token:'mock-token-admin',usuario:{id:'u1',nome:'Carlos Silva',email,perfil:'admin'}};
        if(email==='fernanda@despachapr.com'&&senha==='operador123')return{success:true,token:'mock-token-op',usuario:{id:'u2',nome:'Fernanda Oliveira',email,perfil:'operador'}};
        return{success:false,error:'E-mail ou senha incorretos'};
      },
      logout:async()=>({success:true}),
      verify:async(token)=>{
        if(token==='mock-token-admin')return{valid:true,usuario:{id:'u1',nome:'Carlos Silva',email:'admin@despachapr.com',perfil:'admin'}};
        if(token==='mock-token-op')  return{valid:true,usuario:{id:'u2',nome:'Fernanda Oliveira',email:'fernanda@despachapr.com',perfil:'operador'}};
        return{valid:false};
      },
      changePassword:async({senhaAtual})=>{
        if(senhaAtual!=='admin123'&&senhaAtual!=='operador123')return{success:false,error:'Senha atual incorreta'};
        return{success:true};
      },
      listUsers:async()=>({success:true,data:usuarios}),
      createUser:async(d)=>{
        if(usuarios.find(u=>u.email===d.email))return{success:false,error:'E-mail já cadastrado'};
        const novo={id:genId(),...d,ativo:1};
        usuarios=[...usuarios,novo];
        return{success:true,data:novo};
      },
      updateUser:async(d)=>{usuarios=usuarios.map(u=>u.id===d.id?{...u,...d}:u);return{success:true};},
      deleteUser:async(data)=>{const id=typeof data==='string'?data:data.id;usuarios=usuarios.filter(u=>u.id!==id);return{success:true};},
    },
    crm:{
      getLeads:async(f={})=>{let d=[...leads];if(f.etapa)d=d.filter(l=>l.etapa===f.etapa);return{success:true,data:d};},
      createLead:async(d)=>{const n={id:genId(),criado_em:new Date().toISOString(),posicao_kanban:leads.filter(l=>l.etapa===d.etapa).length+1,...d};leads=[...leads,n];return{success:true,id:n.id};},
      updateLead:async(d)=>{leads=leads.map(l=>l.id===d.id?{...l,...d}:l);return{success:true};},
      moveLead:async({id,etapa,posicao})=>{leads=leads.map(l=>l.id===id?{...l,etapa,posicao_kanban:posicao}:l);return{success:true};},
      deleteLead:async(id)=>{leads=leads.filter(l=>l.id!==id);interacoes=interacoes.filter(i=>i.lead_id!==id);return{success:true};},
      getLeadHistory:async(id)=>({success:true,data:interacoes.filter(i=>i.lead_id===id)}),
      addInteraction:async(d)=>{const n={id:genId(),...d,usuario_nome:'Carlos Silva',criado_em:new Date().toISOString()};interacoes=[...interacoes,n];return{success:true};},
      convertToClient:async(leadId)=>{
        const lead=leads.find(l=>l.id===leadId);
        if(!lead)return{success:false,error:'Lead não encontrado'};
        if(lead.cliente_id)return{success:false,error:'Já convertido',clienteId:lead.cliente_id};
        const clienteId=genId();
        clientes=[...clientes,{id:clienteId,nome:lead.nome,telefone:lead.telefone,whatsapp:lead.whatsapp,email:lead.email||'',tipo:'PF',cidade:'Ibiporã',estado:'PR'}];
        leads=leads.map(l=>l.id===leadId?{...l,cliente_id:clienteId,etapa:'fechado'}:l);
        return{success:true,clienteId};
      },
      getClients:async(f={})=>{
        let d=[...clientes];
        if(f.search){const q=f.search.toLowerCase();d=d.filter(c=>c.nome?.toLowerCase().includes(q)||c.cpf_cnpj?.includes(q)||c.telefone?.includes(q));}
        return{success:true,data:d};
      },
      getClient:async(id)=>{const c=clientes.find(c=>c.id===id);if(!c)return{success:false,error:'Não encontrado'};return{success:true,data:{...c,processos:processos.filter(p=>p.cliente_id===id),veiculos:c.veiculos||[],financeiro:lancamentos.filter(l=>l.cliente_id===id)}};},
      createClient:async(d)=>{const n={id:genId(),criado_em:new Date().toISOString(),...d};clientes=[...clientes,n];return{success:true,id:n.id,data:n};},
      updateClient:async(d)=>{clientes=clientes.map(c=>c.id===d.id?{...c,...d}:c);return{success:true};},
      deleteClient:async(id)=>{clientes=clientes.filter(c=>c.id!==id);return{success:true};},
      search:async(q)=>{
        if(!q||q.length<2)return{success:true,data:[]};
        const t=q.toLowerCase();
        const rl=leads.filter(l=>l.nome?.toLowerCase().includes(t)||l.telefone?.includes(t)||l.veiculo_placa?.toLowerCase().includes(t)).slice(0,4).map(l=>({...l,tipo:'lead',status:l.etapa}));
        const rc=clientes.filter(c=>c.nome?.toLowerCase().includes(t)||c.cpf_cnpj?.includes(t)||c.telefone?.includes(t)).slice(0,4).map(c=>({...c,tipo:'cliente',status:''}));
        return{success:true,data:[...rl,...rc]};
      },
    },
    processo:{
      list:async(clienteId)=>({success:true,data:processos.filter(p=>p.cliente_id===clienteId)}),
      listAll:async()=>({success:true,data:processos}),
      create:async(d)=>{
        const seq=processos.length+1;
        const numero=`${new Date().getFullYear()}-${String(seq).padStart(4,'0')}`;
        const n={id:genId(),numero,criado_em:new Date().toISOString(),status:'aberto',...d};
        processos=[...processos,n];
        if(d.valor>0){lancamentos=[...lancamentos,{id:genId(),tipo:'receita',categoria:'Serviços de Despachante',descricao:`Processo ${numero}`,valor:d.valor,data_vencimento:d.data_vencimento||new Date().toISOString().slice(0,10),status:'pendente',cliente_id:d.cliente_id}];}
        return{success:true,id:n.id,numero};
      },
      update:async(d)=>{processos=processos.map(p=>p.id===d.id?{...p,...d}:p);return{success:true};},
    },
    docs:{
      upload:async(d)=>{const n={id:genId(),criado_em:new Date().toISOString(),status:'pendente',...d,nome_original:d.nome_original||d.file_path?.split(/[\\/]/).pop()||'arquivo.pdf',mime_type:'application/pdf',tamanho:102400};documentos=[...documentos,n];return{success:true,id:n.id};},
      list:async(processoId)=>({success:true,data:documentos.filter(d=>d.processo_id===processoId)}),
      listByCliente:async(clienteId,filters={})=>({success:true,data:documentos.filter(d=>d.cliente_id===clienteId&&(!filters.processo_id||d.processo_id===filters.processo_id))}),
      delete:async(id)=>{documentos=documentos.filter(d=>d.id!==id);return{success:true};},
      updateStatus:async({id,status})=>{documentos=documentos.map(d=>d.id===id?{...d,status}:d);return{success:true};},
      open:async()=>{},
      selectFile:async()=>'/mock/path/documento_exemplo.pdf',
      selectDirectory:async()=>null,
      setDirectory:async(dir)=>{localStorage.setItem('docsDirectory',dir);return{success:true};},
      getDirectory:async()=>localStorage.getItem('docsDirectory'),
    },
    financeiro:{
      getContasReceber:async(f={})=>{let d=lancamentos.filter(l=>l.tipo==='receita');if(f.status)d=d.filter(l=>l.status===f.status);return{success:true,data:d};},
      getContasPagar:  async(f={})=>{let d=lancamentos.filter(l=>l.tipo==='despesa');if(f.status)d=d.filter(l=>l.status===f.status);return{success:true,data:d};},
      getInadimplentes:async()=>({success:true,data:lancamentos.filter(l=>l.tipo==='receita'&&l.status==='atrasado')}),
      createLancamento:async(d)=>{const n={id:genId(),criado_em:new Date().toISOString(),status:'pendente',...d};lancamentos=[...lancamentos,n];return{success:true,id:n.id};},
      updateLancamento:async(d)=>{lancamentos=lancamentos.map(l=>l.id===d.id?{...l,...d}:l);return{success:true};},
      registrarPagamento:async({id,forma_pagamento,data_pagamento})=>{
        lancamentos=lancamentos.map(l=>l.id===id?{...l,status:'pago',forma_pagamento,data_pagamento:data_pagamento||new Date().toISOString().slice(0,10)}:l);
        if(caixaAtual?.status==='aberto'){
          const lanc=lancamentos.find(l=>l.id===id);
          if(lanc){const mv={id:genId(),caixa_id:caixaAtual.id,tipo:lanc.tipo==='receita'?'entrada':'saida',descricao:lanc.descricao,valor:lanc.valor,forma_pagamento,criado_em:new Date().toISOString()};movimentos=[...movimentos,mv];}
        }
        return{success:true};
      },
      getFluxoCaixa:async()=>{
        const pagos=lancamentos.filter(l=>l.status==='pago'&&l.data_pagamento);
        const byDate={};
        pagos.forEach(l=>{const d=l.data_pagamento;if(!byDate[d])byDate[d]={data:d,receitas:0,despesas:0,saldo:0};if(l.tipo==='receita'){byDate[d].receitas+=l.valor;byDate[d].saldo+=l.valor;}else{byDate[d].despesas+=l.valor;byDate[d].saldo-=l.valor;}});
        return{success:true,data:Object.values(byDate).sort((a,b)=>a.data.localeCompare(b.data))};
      },
      getDashboard:async()=>{
        const receitaMes=lancamentos.filter(l=>l.tipo==='receita'&&l.status==='pago').reduce((s,l)=>s+l.valor,0);
        const despesaMes=lancamentos.filter(l=>l.tipo==='despesa'&&l.status==='pago').reduce((s,l)=>s+l.valor,0);
        const totalReceber=lancamentos.filter(l=>l.tipo==='receita'&&l.status!=='pago'&&l.status!=='cancelado').reduce((s,l)=>s+l.valor,0);
        const totalPagar=lancamentos.filter(l=>l.tipo==='despesa'&&l.status!=='pago'&&l.status!=='cancelado').reduce((s,l)=>s+l.valor,0);
        const inadimplentes=lancamentos.filter(l=>l.status==='atrasado').length;
        return{success:true,data:{totalReceber,totalPagar,receitaMes,despesaMes,inadimplentes,saldoMes:receitaMes-despesaMes}};
      },
      reverterPagamento:async(id)=>{
        lancamentos=lancamentos.map(l=>l.id===id?{...l,status:'pendente',forma_pagamento:null,data_pagamento:null}:l);
        return{success:true};
      },
    },
    caixa:{
      getAtual:async()=>({success:true,data:caixaAtual}),
      abrir:async({valor_inicial,usuario_nome})=>{
        if(caixaAtual?.status==='aberto')return{success:false,error:'Já existe um caixa aberto'};
        caixaAtual={id:genId(),status:'aberto',valor_inicial:valor_inicial||0,usuario_nome:usuario_nome||'Operador',data_abertura:new Date().toISOString()};
        movimentos=[];
        return{success:true};
      },
      fechar:async({valor_final,observacoes})=>{
        if(!caixaAtual||caixaAtual.status!=='aberto')return{success:false,error:'Nenhum caixa aberto'};
        const fechado={...caixaAtual,status:'fechado',valor_final,observacoes,data_fechamento:new Date().toISOString(),movimentos:[...movimentos]};
        historicoCaixas=[...historicoCaixas,fechado];
        caixaAtual=null;
        movimentos=[];
        return{success:true};
      },
      addMovimento:async(d)=>{
        if(!caixaAtual||caixaAtual.status!=='aberto')return{success:false,error:'Caixa não está aberto'};
        const mv={id:genId(),caixa_id:caixaAtual.id,criado_em:new Date().toISOString(),...d};
        movimentos=[...movimentos,mv];
        return{success:true};
      },
      getMovimentos:async()=>({success:true,data:movimentos}),
      getHistorico:async()=>({success:true,data:historicoCaixas}),
    },
    nf:{
      emitir:async(d)=>{
        const numero=`NFS-${String(notasFiscais.length+1).padStart(6,'0')}`;
        const iss=d.valor_servico*(d.aliquota_iss||5)/100;
        const n={id:genId(),numero,...d,valor_iss:iss,valor_liquido:d.valor_servico-iss,status:'emitida',emitida_em:new Date().toISOString(),simulado:true,cliente_nome:clientes.find(c=>c.id===d.cliente_id)?.nome};
        notasFiscais=[...notasFiscais,n];
        return{success:true,numero,simulado:true};
      },
      list:async()=>({success:true,data:notasFiscais}),
      cancelar:async({id})=>{notasFiscais=notasFiscais.map(n=>n.id===id?{...n,status:'cancelada',cancelada_em:new Date().toISOString()}:n);return{success:true};},
      getServicos:async()=>({success:true,data:SERVICOS_CATALOGO}),
      openPDF:async()=>{},
    },
    relatorios:{
      dashboard:async()=>({success:true,data:{
        vendasMes:[{mes:'Nov',valor:3200},{mes:'Dez',valor:4100},{mes:'Jan',valor:3800},{mes:'Fev',valor:4500},{mes:'Mar',valor:3900},{mes:'Abr',valor:4820}],
        servicosTop:[{nome:'Transferência',total:12,valor:3360},{nome:'Licenciamento',total:18,valor:2160},{nome:'Emplacamento',total:5,valor:1750},{nome:'CNH 2ª via',total:7,valor:1260}],
        leadsConversao:{total:leads.length,fechados:leads.filter(l=>l.etapa==='fechado').length,taxa:Math.round(leads.filter(l=>l.etapa==='fechado').length/Math.max(leads.length,1)*100)},
      }}),
      vendas:async()=>({success:true,data:lancamentos.filter(l=>l.tipo==='receita')}),
      conversao:async()=>({success:true,data:leads}),
      receitaMensal:async()=>({success:true,data:[]}),
      servicosMaisVendidos:async()=>({success:true,data:[]}),
      exportExcel:async()=>{alert('Em produção: exporta arquivo .xlsx com os dados do período.');return{success:true};},
      exportPDF:  async()=>{alert('Em produção: exporta arquivo .pdf com o relatório do período.');return{success:true};},
    },
    whatsapp:{
      init:async()=>({success:true}),
      sendMessage:async()=>({success:true}),
      getTemplates:async()=>({success:true,data:[
        {id:'t1',nome:'Boas-vindas', categoria:'atendimento',mensagem:'Olá, {{nome}}! 👋 Bem-vindo ao DespachaPR!'},
        {id:'t2',nome:'Proposta',   categoria:'comercial',  mensagem:'Olá, {{nome}}! Segue proposta: {{servico}} — R$ {{valor}}'},
        {id:'t3',nome:'Confirmação',categoria:'financeiro', mensagem:'Pagamento confirmado! ✅ Processo nº {{processo}}'},
      ]}),
      createTemplate:async(d)=>({success:true,id:genId(),data:d}),
      updateTemplate:async()=>({success:true}),
      deleteTemplate:async()=>({success:true}),
      getFlows:async()=>({success:true,data:JSON.parse(localStorage.getItem('dp_settings_whatsappFlows')||'null')||[
        {id:'boas_vindas',nome:'Boas-vindas',desc:'Enviado ao primeiro contato de um novo número',ativo:true},
        {id:'coleta_dados',nome:'Coleta de Dados',desc:'Solicita CPF, placa e serviço automaticamente',ativo:true},
        {id:'lembrete_vencimento',nome:'Lembrete de Vencimento',desc:'Avisa sobre licenciamento próximo ao vencimento',ativo:false},
      ]}),
      saveFlows:async(flows)=>{localStorage.setItem('dp_settings_whatsappFlows',JSON.stringify(flows));return{success:true};},
      getStatus:async()=>({success:true,status:'disconnected'}),
      disconnect:async()=>({success:true}),
      onQR:()=>{},onReady:()=>{},onMessage:()=>{},
    },
    system:{
      backup:async()=>{alert('Em produção: abre seletor de pasta e salva backup .zip.');return{success:true};},
      getSettings:async(key)=>({success:true,data:JSON.parse(localStorage.getItem(`dp_settings_${key}`)||'null')}),
      setSettings:async({key,value})=>{localStorage.setItem(`dp_settings_${key}`,JSON.stringify(value));return{success:true,data:value};},
    },
    log:{getRecent:async()=>({success:true,data:[]}),export:async()=>({success:true})},
    notifications:{
      getAll:async()=>({success:true,data:[
        {id:'n1',tipo:'alerta',titulo:'Contas em Atraso',mensagem:'1 conta a receber atrasada',lida:0,criado_em:new Date().toISOString()},
        {id:'n2',tipo:'info',  titulo:'Novo Lead',       mensagem:'Lucas Martins via WhatsApp', lida:0,criado_em:new Date().toISOString()},
      ]}),
      markRead:async()=>({success:true}),
      onNew:()=>{},
    },
  };
}

const api = window.electronAPI || createMockAPI();
window._api = api;
export { api };

const PAGES = {dashboard:Dashboard,crm:CRMPage,clientes:ClientesPage,financeiro:FinanceiroPage,caixa:CaixaPage,documentos:DocumentosPage,notas:NotasFiscaisPage,relatorios:RelatoriosPage,whatsapp:WhatsAppPage,config:ConfigPage};

export default function App() {
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [currentPage,setCurrentPage]=useState('dashboard');
  const [toasts,setToasts]=useState([]);

  useEffect(()=>{
    const token=localStorage.getItem('dp_token');
    if(token){api.auth.verify(token).then(r=>{if(r.valid)setSession({token,usuario:r.usuario});setLoading(false);});}
    else setLoading(false);
  },[]);

  const addToast=(message,type='info',duration=3500)=>{const id=Date.now();setToasts(t=>[...t,{id,message,type}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),duration);};
  const handleLogin=(d)=>{localStorage.setItem('dp_token',d.token);setSession(d);};
  const handleLogout=async()=>{
    const token = session?.token;
    localStorage.removeItem('dp_token');
    setCurrentPage('dashboard');
    setSession(null);
    if(token) await api.auth.logout(token);
  };

  if(loading)return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0e0f11'}}><div style={{textAlign:'center'}}><div style={{fontSize:28,fontFamily:'Syne,sans-serif',fontWeight:800,color:'#f0a500'}}>DespachaPR</div><div style={{color:'#4a4f5c',fontSize:13,marginTop:8}}>Carregando...</div></div></div>);

  if(!session)return(<ToastContext.Provider value={addToast}><LoginPage onLogin={handleLogin}/><ToastContainer toasts={toasts}/></ToastContext.Provider>);

  const PageComponent=PAGES[currentPage]||Dashboard;
  return(
    <AuthContext.Provider value={{session,logout:handleLogout}}>
      <ToastContext.Provider value={addToast}>
        <NavContext.Provider value={{currentPage,navigate:setCurrentPage}}>
          <Shell><PageComponent/></Shell>
          <ToastContainer toasts={toasts}/>
        </NavContext.Provider>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}
