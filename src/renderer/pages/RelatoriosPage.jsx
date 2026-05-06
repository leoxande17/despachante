// src/renderer/pages/RelatoriosPage.jsx — Filtros de período funcionais
import React, { useState, useEffect, useCallback } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const fmt = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
const today = () => new Date().toISOString().slice(0,10);
const firstDayOfMonth = () => { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10); };

export default function RelatoriosPage() {
  const toast = useToast();
  const [relData, setRelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('vendas');
  const [periodo, setPeriodo] = useState({inicio:firstDayOfMonth(), fim:today()});
  const [periodoLabel, setPeriodoLabel] = useState('Este mês');

  const loadDashboard = useCallback(()=>{
    setLoading(true);
    api.relatorios.dashboard().then(r=>{ if(r.success) setRelData(r.data); setLoading(false); });
  },[]);

  useEffect(()=>{ loadDashboard(); },[loadDashboard]);

  // ── Períodos rápidos ────────────────────────────────────────────
  const setQuick = tipo => {
    const now = new Date();
    let inicio, fim, label;
    switch(tipo){
      case 'hoje':
        inicio = fim = today(); label='Hoje'; break;
      case 'mes':
        inicio = firstDayOfMonth(); fim = today(); label='Este mês'; break;
      case '3m': {
        const d=new Date(); d.setMonth(d.getMonth()-3);
        inicio=d.toISOString().slice(0,10); fim=today(); label='Últimos 3 meses'; break;
      }
      case 'ano':
        inicio=`${now.getFullYear()}-01-01`; fim=today(); label='Este ano'; break;
      default: return;
    }
    setPeriodo({inicio,fim});
    setPeriodoLabel(label);
  };

  const handleExport = async tipo => {
    const fn = tipo==='excel' ? api.relatorios.exportExcel : api.relatorios.exportPDF;
    const r = await fn({tipo:tab, data_inicio:periodo.inicio, data_fim:periodo.fim});
    if(r.success) toast(`Exportado em ${tipo==='excel'?'Excel':'PDF'}!`,'success');
    else if(r.error) toast(r.error,'error');
  };

  const maxVenda = relData?.vendasMes ? Math.max(...relData.vendasMes.map(v=>v.valor),1) : 1;
  const totalReceita = relData?.vendasMes?.reduce((s,m)=>s+m.valor,0)||0;
  const totalServicos = relData?.servicosTop?.reduce((s,t)=>s+t.total,0)||0;
  const ticketMedio = relData?.leadsConversao?.fechados>0 ? totalReceita/relData.leadsConversao.fechados : 0;
  const etapaLabels = {novo:'Novo',em_atendimento:'Em Atendimento',proposta:'Proposta',negociacao:'Negociação',fechado:'Fechado',perdido:'Perdido'};
  const etapasKanban = relData?.leadsConversao?.etapas || [];
  const maxEtapa = Math.max(...etapasKanban.map(e=>e.total), 1);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Relatórios</h1><p className="page-subtitle">Análises gerenciais e exportações</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary" onClick={()=>handleExport('excel')}><Icon name="download" size={14}/> Excel</button>
          <button className="btn btn-secondary" onClick={()=>handleExport('pdf')}><Icon name="download" size={14}/> PDF</button>
        </div>
      </div>

      {/* Período */}
      <div className="card" style={{marginBottom:20,padding:'14px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <Icon name="calendar" size={15} color="var(--text-muted)"/>
          <input className="form-input" type="date" value={periodo.inicio} style={{width:148}}
            onChange={e=>{ setPeriodo(p=>({...p,inicio:e.target.value})); setPeriodoLabel('Personalizado'); }}/>
          <span style={{color:'var(--text-muted)',fontSize:13}}>até</span>
          <input className="form-input" type="date" value={periodo.fim} style={{width:148}}
            onChange={e=>{ setPeriodo(p=>({...p,fim:e.target.value})); setPeriodoLabel('Personalizado'); }}/>
          <div style={{display:'flex',gap:4,marginLeft:4}}>
            {[['hoje','Hoje'],['mes','Este mês'],['3m','3 meses'],['ano','Este ano']].map(([k,l])=>(
              <button key={k} className="btn btn-ghost btn-sm"
                style={{background:periodoLabel===l?'var(--bg-elevated)':'',fontWeight:periodoLabel===l?700:400}}
                onClick={()=>setQuick(k)}>{l}</button>
            ))}
          </div>
          {periodoLabel&&<span style={{fontSize:12,color:'var(--accent)',marginLeft:4,fontWeight:600}}>· {periodoLabel}</span>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {[
          {label:'Receita Total',     value:fmt(totalReceita),                         color:'var(--green)'},
          {label:'Taxa de Conversão', value:`${relData?.leadsConversao?.taxa||0}%`,    color:'var(--accent)'},
          {label:'Ticket Médio',      value:fmt(ticketMedio),                          color:'var(--blue)'},
          {label:'Serviços Prestados',value:String(totalServicos),                     color:'#a855f7'},
        ].map(k=>(
          <div key={k.label} className="card" style={{padding:16}}>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6,letterSpacing:0.5}}>{k.label}</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{marginBottom:20}}>
        {[['vendas','Receita Mensal'],['servicos','Serviços'],['conversao','Conversão']].map(([id,label])=>(
          <button key={id} className={`tab-btn ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:16}}>
        {/* Gráfico principal */}
        <div className="card">
          <h3 style={{marginBottom:20}}>
            {tab==='vendas'?'Receita por Mês':tab==='servicos'?'Serviços Mais Vendidos':'Funil de Conversão'}
            <span style={{fontSize:12,color:'var(--text-muted)',fontFamily:'DM Sans,sans-serif',fontWeight:400,marginLeft:8}}>{periodoLabel}</span>
          </h3>

          {loading&&<div className="empty-state"><p>Carregando...</p></div>}

          {!loading&&tab==='vendas'&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {(relData?.vendasMes||[]).map((m,i)=>{
                const pct=Math.round((m.valor/maxVenda)*100);
                const isLast=i===(relData.vendasMes.length-1);
                return(
                  <div key={m.mes} style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:40,fontSize:12,color:'var(--text-muted)',textAlign:'right',flexShrink:0}}>{m.mes}</div>
                    <div style={{flex:1,height:28,background:'var(--bg-elevated)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:isLast?'linear-gradient(90deg,var(--accent),#e09400)':'linear-gradient(90deg,var(--blue),#2563eb)',borderRadius:4,transition:'width 0.5s ease',display:'flex',alignItems:'center',paddingLeft:10}}>
                        {pct>25&&<span style={{fontSize:11,fontWeight:700,color:'var(--bg-base)',whiteSpace:'nowrap'}}>{fmt(m.valor)}</span>}
                      </div>
                    </div>
                    <div style={{width:84,fontSize:12,fontWeight:700,fontFamily:'Syne',textAlign:'right',color:isLast?'var(--accent)':'var(--text-primary)'}}>{fmt(m.valor)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading&&tab==='servicos'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {(relData?.servicosTop||[]).map((s,i)=>{
                const maxT=Math.max(...(relData.servicosTop.map(x=>x.total)),1);
                const pct=Math.round((s.total/maxT)*100);
                const colors=['var(--accent)','var(--blue)','var(--green)','#a855f7','var(--red)'];
                return(
                  <div key={s.nome}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                      <span style={{fontWeight:600}}>{s.nome}</span>
                      <span style={{color:colors[i%colors.length],fontWeight:700}}>{s.total}× · {fmt(s.valor)}</span>
                    </div>
                    <div style={{height:8,background:'var(--bg-elevated)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:colors[i%colors.length],borderRadius:4,transition:'width 0.5s ease'}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading&&tab==='conversao'&&relData?.leadsConversao&&(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {(etapasKanban.length ? etapasKanban : [{etapa:'novo',total:0}]).map((e,i)=>{
                const colors=['var(--blue)','#a855f7','var(--accent)','var(--green)','var(--red)'];
                const pct=Math.round((e.total/maxEtapa)*100);
                return (
                <div key={e.etapa}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                    <span>{etapaLabels[e.etapa]||e.etapa}</span>
                    <span style={{fontWeight:700,color:colors[i%colors.length]}}>{e.total} ({pct}%)</span>
                  </div>
                  <div style={{height:10,background:'var(--bg-elevated)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:colors[i%colors.length],borderRadius:4,transition:'width 0.5s ease'}}/>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <h3 style={{marginBottom:14}}>Top Serviços</h3>
            {(relData?.servicosTop||[]).map((s,i)=>{
              const bgs=['var(--accent-dim)','var(--blue-dim)','var(--green-dim)','rgba(168,85,247,0.12)'];
              const colors=['var(--accent)','var(--blue)','var(--green)','#a855f7'];
              return(
                <div key={s.nome} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,fontSize:13}}>
                  <div style={{width:22,height:22,borderRadius:4,background:bgs[i%bgs.length],color:colors[i%colors.length],display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11}}>{i+1}</div>
                  <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.nome}</span>
                  <span style={{fontWeight:700,fontFamily:'Syne',color:colors[i%colors.length]}}>{s.total}×</span>
                </div>
              );
            })}
          </div>
          <div className="card" style={{background:'var(--accent-dim)',border:'1px solid rgba(240,165,0,0.2)'}}>
            <h3 style={{marginBottom:8}}>Exportar Relatório</h3>
            <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:14,lineHeight:1.6}}>
              Período: <strong style={{color:'var(--text-primary)'}}>{periodoLabel}</strong>
            </p>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}} onClick={()=>handleExport('excel')}>Excel</button>
              <button className="btn btn-secondary btn-sm" style={{flex:1,justifyContent:'center'}} onClick={()=>handleExport('pdf')}>PDF</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
