// src/renderer/pages/CRMPage.jsx — Funil de vendas com D&D funcional + máscaras
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const ETAPAS = [
  {id:'novo',          label:'Novos',         color:'#6b7280'},
  {id:'em_atendimento',label:'Em Atendimento',color:'#3b82f6'},
  {id:'proposta',      label:'Proposta',      color:'#a855f7'},
  {id:'negociacao',    label:'Negociação',    color:'#f0a500'},
  {id:'fechado',       label:'Fechado',       color:'#22c55e'},
  {id:'perdido',       label:'Perdido',       color:'#ef4444'},
];
const ORIGENS = ['whatsapp','indicacao','instagram','google','manual','outro'];
const fmt = v => v ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v) : '';

// ── Máscaras ─────────────────────────────────────────────────────
const maskPhone = v => {
  const d = v.replace(/\D/g,'').slice(0,11);
  if(d.length<=10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})$/,'($1) $2-$3').replace(/-$/,'');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})$/,'($1) $2-$3').replace(/-$/,'');
};
const maskPlate = v => {
  const d = v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7);
  if(d.length<=3) return d;
  return d.slice(0,3)+'-'+d.slice(3);
};
const maskMoney = v => {
  const d = v.replace(/\D/g,'');
  if(!d) return '';
  const n = parseInt(d,10)/100;
  return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
};
const parseMoney = v => parseFloat(v.replace(/\./g,'').replace(',','.'))||0;

export default function CRMPage() {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  // D&D state
  const dragId   = useRef(null);
  const dragOver = useRef(null);
  const [overCol, setOverCol] = useState(null);

  const loadLeads = useCallback(() => {
    setLoading(true);
    api.crm.getLeads().then(r => { if(r.success) setLeads(r.data); setLoading(false); });
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const byEtapa = etapa => [...leads].filter(l=>l.etapa===etapa).sort((a,b)=>a.posicao_kanban-b.posicao_kanban);

  // ── Drag & Drop (HTML5 nativo) ─────────────────────────────────
  const onDragStart = (e, id) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (e, etapa) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if(dragOver.current !== etapa) { dragOver.current = etapa; setOverCol(etapa); }
  };
  const onDragLeave = () => { dragOver.current = null; setOverCol(null); };
  const onDrop = async (e, etapa) => {
    e.preventDefault();
    const id = dragId.current || e.dataTransfer.getData('text/plain');
    setOverCol(null); dragId.current = null; dragOver.current = null;
    if(!id) return;
    const lead = leads.find(l=>l.id===id);
    if(!lead || lead.etapa === etapa) return;
    // Optimistic update
    const newPos = byEtapa(etapa).length + 1;
    setLeads(prev => prev.map(l => l.id===id ? {...l, etapa, posicao_kanban: newPos} : l));
    const r = await api.crm.moveLead({id, etapa, posicao: newPos});
    if(r.success) toast(`Movido para "${ETAPAS.find(e=>e.id===etapa)?.label}"`, 'success');
    else { toast('Erro ao mover lead', 'error'); loadLeads(); }
  };
  const onDragEnd = () => { dragId.current = null; dragOver.current = null; setOverCol(null); };

  // ── CRUD ──────────────────────────────────────────────────────
  const handleSave = async data => {
    let r;
    if(editingLead?.id) r = await api.crm.updateLead({...editingLead,...data});
    else                r = await api.crm.createLead(data);
    if(r.success){ toast(editingLead?.id?'Lead atualizado!':'Lead criado!','success'); setShowModal(false); setEditingLead(null); loadLeads(); }
    else toast(r.error||'Erro ao salvar','error');
  };
  const handleDelete = async id => {
    if(!confirm('Remover este lead?')) return;
    await api.crm.deleteLead(id);
    toast('Lead removido','info');
    setDetailLead(null);
    loadLeads();
  };
  const handleConvert = async id => {
    const r = await api.crm.convertToClient(id);
    if(r.success){ toast('Lead convertido em cliente!','success'); setDetailLead(null); loadLeads(); }
    else toast(r.error||'Erro ao converter','error');
  };

  const total = leads.filter(l=>!['perdido'].includes(l.etapa)).reduce((s,l)=>s+(l.valor_estimado||0),0);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="page-header" style={{marginBottom:16}}>
        <div>
          <h1 className="page-title">Funil de Vendas</h1>
          <p className="page-subtitle">{leads.length} leads · Pipeline {fmt(total)}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={loadLeads}><Icon name="refresh" size={14}/> Atualizar</button>
          <button className="btn btn-primary" onClick={()=>{setEditingLead(null);setShowModal(true);}}>
            <Icon name="plus" size={15}/> Novo Lead
          </button>
        </div>
      </div>

      {loading ? <div className="empty-state">Carregando...</div> : (
        <div className="kanban-board">
          {ETAPAS.map(etapa => {
            const col = byEtapa(etapa.id);
            const colTotal = col.reduce((s,l)=>s+(l.valor_estimado||0),0);
            return (
              <div key={etapa.id} className="kanban-col"
                style={{'--col':etapa.color}}
                onDragOver={e=>onDragOver(e,etapa.id)}
                onDragLeave={onDragLeave}
                onDrop={e=>onDrop(e,etapa.id)}
              >
                <div className="kanban-col-header" style={{borderLeft:`3px solid ${etapa.color}`}}>
                  <span className="kanban-col-title">{etapa.label}</span>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    {colTotal>0&&<span style={{fontSize:11,color:'var(--text-muted)'}}>{fmt(colTotal)}</span>}
                    <span className="kanban-count">{col.length}</span>
                  </div>
                </div>
                <div className="kanban-cards" style={{
                  background: overCol===etapa.id ? 'rgba(240,165,0,0.05)':'',
                  transition:'background 0.15s', minHeight:60,
                }}>
                  {col.map(lead => (
                    <div key={lead.id} className="kanban-card"
                      draggable
                      onDragStart={e=>onDragStart(e,lead.id)}
                      onDragEnd={onDragEnd}
                      onClick={()=>setDetailLead(lead)}
                      style={{opacity: dragId.current===lead.id?0.45:1, cursor:'grab'}}
                    >
                      <div className="kanban-card-name">{lead.nome}</div>
                      <div className="kanban-card-meta">
                        {lead.telefone&&<span>{lead.telefone}</span>}
                        {lead.servico_interesse&&<span className="badge badge-blue" style={{fontSize:10}}>{lead.servico_interesse}</span>}
                        <span className="badge badge-gray" style={{fontSize:10}}>{lead.origem}</span>
                      </div>
                      {lead.valor_estimado>0&&<div className="kanban-card-value">{fmt(lead.valor_estimado)}</div>}
                    </div>
                  ))}
                  {overCol===etapa.id&&col.length===0&&(
                    <div style={{textAlign:'center',padding:'20px 8px',color:'var(--accent)',fontSize:12,border:'2px dashed var(--accent)',borderRadius:'var(--radius)',background:'var(--accent-dim)'}}>Solte aqui</div>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{width:'100%',justifyContent:'center',marginTop:4,fontSize:12}}
                    onClick={()=>{setEditingLead({etapa:etapa.id});setShowModal(true);}}>
                    <Icon name="plus" size={12}/> Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal&&<LeadModal initial={editingLead} onSave={handleSave} onClose={()=>{setShowModal(false);setEditingLead(null);}}/>}
      {detailLead&&<LeadDetail lead={leads.find(l=>l.id===detailLead.id)||detailLead} onClose={()=>setDetailLead(null)} onEdit={l=>{setDetailLead(null);setEditingLead(l);setShowModal(true);}} onConvert={handleConvert} onDelete={handleDelete}/>}
    </div>
  );
}

function LeadModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    nome:'',telefone:'',whatsapp:'',email:'',origem:'manual',etapa:'novo',
    servico_interesse:'',veiculo_placa:'',valor_estimado:'',motivo_perda:'',
    ...initial,
    valor_estimado: initial?.valor_estimado ? initial.valor_estimado.toLocaleString('pt-BR',{minimumFractionDigits:2}) : '',
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = e => {
    e.preventDefault();
    if(!form.nome.trim()){alert('Nome é obrigatório');return;}
    onSave({...form, valor_estimado: form.valor_estimado ? parseMoney(form.valor_estimado) : null });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial?.id?'Editar Lead':'Novo Lead'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2" style={{gap:14}}>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Nome *</label>
              <input className="form-input" required value={form.nome} maxLength={120}
                onChange={e=>set('nome',e.target.value)} placeholder="Nome completo do lead"/>
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.telefone} maxLength={16}
                onChange={e=>set('telefone',maskPhone(e.target.value))} placeholder="(43) 99999-9999"/>
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" value={form.whatsapp} maxLength={16}
                onChange={e=>set('whatsapp',maskPhone(e.target.value))} placeholder="(43) 99999-9999"/>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={form.email} maxLength={120}
                onChange={e=>set('email',e.target.value)} placeholder="exemplo@email.com"/>
            </div>
            <div className="form-group">
              <label className="form-label">Origem</label>
              <select className="form-select" value={form.origem} onChange={e=>set('origem',e.target.value)}>
                {ORIGENS.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Etapa</label>
              <select className="form-select" value={form.etapa} onChange={e=>set('etapa',e.target.value)}>
                {ETAPAS.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Serviço de Interesse</label>
              <input className="form-input" value={form.servico_interesse} maxLength={100}
                onChange={e=>set('servico_interesse',e.target.value)} placeholder="Ex: Transferência de Veículo"/>
            </div>
            <div className="form-group">
              <label className="form-label">Placa do Veículo</label>
              <input className="form-input" value={form.veiculo_placa} maxLength={8}
                onChange={e=>set('veiculo_placa',maskPlate(e.target.value))} placeholder="AAA-0000"
                style={{fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase'}}/>
            </div>
            <div className="form-group">
              <label className="form-label">Valor Estimado (R$)</label>
              <input className="form-input" value={form.valor_estimado} inputMode="numeric"
                onChange={e=>set('valor_estimado',maskMoney(e.target.value))} placeholder="0,00"
                style={{fontFamily:'monospace'}}/>
            </div>
            {form.etapa==='perdido'&&(
              <div className="form-group">
                <label className="form-label">Motivo da Perda</label>
                <input className="form-input" value={form.motivo_perda} maxLength={200}
                  onChange={e=>set('motivo_perda',e.target.value)} placeholder="Ex: Preço, concorrência..."/>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{initial?.id?'Salvar Alterações':'Criar Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadDetail({ lead, onClose, onEdit, onConvert, onDelete }) {
  const [history, setHistory] = useState([]);
  const [nota, setNota] = useState('');
  const etapaInfo = ETAPAS.find(e=>e.id===lead.etapa);

  useEffect(()=>{
    api.crm.getLeadHistory(lead.id).then(r=>{ if(r.success) setHistory(r.data); });
  },[lead.id]);

  const addNota = async () => {
    if(!nota.trim()) return;
    await api.crm.addInteraction({lead_id:lead.id,tipo:'nota',descricao:nota});
    setNota('');
    api.crm.getLeadHistory(lead.id).then(r=>{ if(r.success) setHistory(r.data); });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{lead.nome}</h3>
            <span className="badge" style={{background:`${etapaInfo?.color}22`,color:etapaInfo?.color,marginTop:4}}>
              {etapaInfo?.label}
            </span>
          </div>
          <div style={{display:'flex',gap:6}}>
            {!lead.cliente_id&&lead.etapa!=='perdido'&&(
              <button className="btn btn-secondary btn-sm" onClick={()=>onConvert(lead.id)}><Icon name="check" size={13}/> Converter</button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={()=>onEdit(lead)}><Icon name="edit" size={13}/> Editar</button>
            <button className="btn btn-danger btn-sm" onClick={()=>onDelete(lead.id)}><Icon name="trash" size={13}/></button>
            <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:1,marginBottom:12}}>INFORMAÇÕES</div>
            {[['Telefone',lead.telefone],['WhatsApp',lead.whatsapp],['E-mail',lead.email],['Origem',lead.origem],['Serviço',lead.servico_interesse],['Placa',lead.veiculo_placa],['Valor est.',lead.valor_estimado?fmt(lead.valor_estimado):null]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:13}}>
                <span style={{color:'var(--text-muted)'}}>{k}</span>
                <span style={{fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:1,marginBottom:12}}>HISTÓRICO</div>
            <div style={{maxHeight:220,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
              {history.length===0&&<div style={{color:'var(--text-muted)',fontSize:12}}>Sem interações ainda</div>}
              {history.map(h=>(
                <div key={h.id} style={{padding:'8px 12px',background:'var(--bg-elevated)',borderRadius:'var(--radius)',fontSize:12}}>
                  <div style={{color:'var(--text-secondary)',marginBottom:2}}>{h.descricao}</div>
                  <div style={{color:'var(--text-muted)',fontSize:11}}>{h.usuario_nome} · {new Date(h.criado_em).toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input className="form-input" placeholder="Adicionar nota..." value={nota}
                onChange={e=>setNota(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addNota()} style={{fontSize:13}}/>
              <button className="btn btn-primary btn-sm" onClick={addNota}><Icon name="send" size={13}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
