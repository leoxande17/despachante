// src/renderer/pages/FinanceiroPage.jsx — Máscara monetária + refresh real
import React, { useState, useEffect, useCallback } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const fmt = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '-';
const STATUS_BADGE = {pendente:'badge-amber',pago:'badge-green',atrasado:'badge-red',cancelado:'badge-gray'};
const FORMAS = ['dinheiro','pix','cartao_debito','cartao_credito','boleto','transferencia'];
const CATS_RECEITA = ['Serviços de Despachante','Taxas Repassadas','Outros'];
const CATS_DESPESA = ['Aluguel','Utilities','Material','Software','Pessoal','Impostos','Outros'];

// Máscara monetária
const maskMoney = v => {
  const d = v.replace(/\D/g,'');
  if(!d) return '';
  const n = parseInt(d,10)/100;
  return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
};
const parseMoney = v => parseFloat(String(v).replace(/\./g,'').replace(',','.'))||0;

export default function FinanceiroPage() {
  const toast = useToast();
  const [tab, setTab] = useState('receber');
  const [lancamentos, setLancamentos] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLanc, setEditingLanc] = useState(null);
  const [pagModal, setPagModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const tipo = tab === 'receber' ? 'receber' : tab === 'pagar' ? 'pagar' : 'inadimplentes';
    const [res, dash] = await Promise.all([
      tab === 'receber'       ? api.financeiro.getContasReceber()  :
      tab === 'pagar'         ? api.financeiro.getContasPagar()    :
                                api.financeiro.getInadimplentes(),
      api.financeiro.getDashboard()
    ]);
    if(res.success)  setLancamentos(res.data);
    if(dash.success) setDashboard(dash.data);
    setLoading(false);
  },[tab, refreshKey]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refresh = () => setRefreshKey(k=>k+1);

  const handleSave = async data => {
    let r;
    if(editingLanc?.id) r = await api.financeiro.updateLancamento({...editingLanc,...data});
    else                r = await api.financeiro.createLancamento({...data, tipo: tab==='pagar'?'despesa':'receita'});
    if(r.success){ toast('Lançamento salvo!','success'); setShowModal(false); setEditingLanc(null); refresh(); }
    else toast(r.error||'Erro ao salvar','error');
  };

  const handlePagar = async data => {
    const r = await api.financeiro.registrarPagamento({id:pagModal.id,...data});
    if(r.success){ toast('Pagamento registrado!','success'); setPagModal(null); refresh(); }
    else toast(r.error||'Erro','error');
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Financeiro</h1><p className="page-subtitle">Contas a pagar e receber</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={refresh}><Icon name="refresh" size={14}/> Atualizar</button>
          <button className="btn btn-primary" onClick={()=>{setEditingLanc(null);setShowModal(true);}}>
            <Icon name="plus" size={15}/> Novo Lançamento
          </button>
        </div>
      </div>

      {/* KPIs */}
      {dashboard && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[
            {label:'Receita do Mês', value:fmt(dashboard.receitaMes),  color:'var(--green)' },
            {label:'A Receber',      value:fmt(dashboard.totalReceber), color:'var(--accent)'},
            {label:'A Pagar',        value:fmt(dashboard.totalPagar),   color:'var(--red)'  },
            {label:'Saldo do Mês',   value:fmt(dashboard.saldoMes),     color:'var(--blue)' },
          ].map(k=>(
            <div key={k.label} className="card" style={{padding:16}}>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6}}>{k.label}</div>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{marginBottom:16}}>
        {[
          {id:'receber',      label:'A Receber'},
          {id:'pagar',        label:'A Pagar'},
          {id:'inadimplentes',label:`Inadimplentes${dashboard?.inadimplentes>0?` (${dashboard.inadimplentes})`:''}`},
        ].map(t=>(
          <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Tabela */}
      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Descrição</th><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Forma Pag.</th><th></th></tr>
            </thead>
            <tbody>
              {loading&&<tr><td colSpan={7} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>Carregando...</td></tr>}
              {!loading&&lancamentos.length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>Nenhum lançamento</td></tr>}
              {lancamentos.map(l=>(
                <tr key={l.id}>
                  <td style={{color:'var(--text-primary)',fontWeight:500}}>{l.descricao}</td>
                  <td>{l.cliente_nome||'-'}</td>
                  <td style={{color:l.status==='atrasado'?'var(--red)':''}}>{fmtDate(l.data_vencimento)}</td>
                  <td style={{fontFamily:'Syne',fontWeight:700,color:l.tipo==='receita'?'var(--green)':'var(--red)'}}>
                    {l.tipo==='receita'?'+':'-'}{fmt(l.valor)}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[l.status]||'badge-gray'}`}>{l.status}</span></td>
                  <td style={{fontSize:12}}>{l.data_pagamento?`${fmtDate(l.data_pagamento)} · ${l.forma_pagamento}`:'-'}</td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      {(l.status==='pendente'||l.status==='atrasado')&&(
                        <button className="btn btn-secondary btn-sm" onClick={()=>setPagModal(l)}>
                          <Icon name="check" size={12}/> Registrar
                        </button>
                      )}
                      {l.status==='pago'&&(
                        <button className="btn btn-secondary btn-sm" onClick={async()=>{
                          if(confirm('Tem certeza que deseja voltar este lançamento para pendente?')){
                            const r = await api.financeiro.reverterPagamento(l.id);
                            if(r.success){ toast('Lançamento revertido para pendente!','success'); refresh(); }
                            else toast(r.error||'Erro','error');
                          }
                        }}>
                          <Icon name="rotate-ccw" size={12}/> Voltar
                        </button>
                      )}
                      <button className="btn btn-icon btn-ghost" onClick={()=>{setEditingLanc(l);setShowModal(true);}}>
                        <Icon name="edit" size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal&&(
        <LancamentoModal
          initial={editingLanc}
          tipo={tab==='pagar'?'despesa':'receita'}
          onSave={handleSave}
          onClose={()=>{setShowModal(false);setEditingLanc(null);}}
        />
      )}
      {pagModal&&<PagamentoModal lancamento={pagModal} onSave={handlePagar} onClose={()=>setPagModal(null)}/>}
    </div>
  );
}

function LancamentoModal({ initial, tipo, onSave, onClose }) {
  const cats = tipo==='receita' ? CATS_RECEITA : CATS_DESPESA;
  const [form, setForm] = useState({
    categoria: cats[0],
    descricao:'',
    valor:'',
    data_vencimento: new Date().toISOString().slice(0,10),
    observacoes:'',
    ...initial,
    valor: initial?.valor ? initial.valor.toLocaleString('pt-BR',{minimumFractionDigits:2}) : '',
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const handleSubmit = e => {
    e.preventDefault();
    const valor = parseMoney(form.valor);
    if(valor<=0){ alert('Informe um valor válido'); return; }
    onSave({...form, valor});
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial?.id?'Editar Lançamento':`Novo ${tipo==='receita'?'Recebimento':'Pagamento'}`}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.categoria} onChange={e=>set('categoria',e.target.value)}>
                {cats.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição *</label>
              <input className="form-input" required value={form.descricao} maxLength={200}
                onChange={e=>set('descricao',e.target.value)} placeholder="Descreva o lançamento"/>
            </div>
            <div className="form-grid form-grid-2" style={{gap:14}}>
              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input className="form-input" required value={form.valor} inputMode="numeric"
                  onChange={e=>set('valor',maskMoney(e.target.value))} placeholder="0,00"
                  style={{fontFamily:'monospace'}}/>
              </div>
              <div className="form-group">
                <label className="form-label">Vencimento *</label>
                <input className="form-input" required type="date" value={form.data_vencimento}
                  onChange={e=>set('data_vencimento',e.target.value)}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" value={form.observacoes} maxLength={500}
                onChange={e=>set('observacoes',e.target.value)}/>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PagamentoModal({ lancamento, onSave, onClose }) {
  const [forma, setForma] = useState('pix');
  const [data, setData] = useState(new Date().toISOString().slice(0,10));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>Registrar Pagamento</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div style={{marginBottom:16,padding:12,background:'var(--bg-elevated)',borderRadius:'var(--radius)'}}>
          <div style={{fontSize:13,color:'var(--text-muted)'}}>{lancamento.descricao}</div>
          <div style={{fontFamily:'Syne',fontWeight:800,fontSize:22,color:'var(--accent)',marginTop:4}}>
            {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(lancamento.valor)}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-group">
            <label className="form-label">Forma de Pagamento</label>
            <select className="form-select" value={forma} onChange={e=>setForma(e.target.value)}>
              {FORMAS.map(f=><option key={f} value={f}>{f.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data do Pagamento</label>
            <input className="form-input" type="date" value={data} onChange={e=>setData(e.target.value)}/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>onSave({forma_pagamento:forma,data_pagamento:data})}>
            <Icon name="check" size={14}/> Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}
