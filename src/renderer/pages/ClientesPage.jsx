// src/renderer/pages/ClientesPage.jsx — Máscaras, validações, refresh, documentos
import React, { useState, useEffect, useCallback } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

// ── Máscaras ─────────────────────────────────────────────────────
const maskCPF  = v => { const d=v.replace(/\D/g,'').slice(0,11); if(d.length<=3)return d; if(d.length<=6)return d.replace(/^(\d{3})(\d+)$/,'$1.$2'); if(d.length<=9)return d.replace(/^(\d{3})(\d{3})(\d+)$/,'$1.$2.$3'); return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/,'$1.$2.$3-$4'); };
const maskCNPJ = v => { const d=v.replace(/\D/g,'').slice(0,14); if(d.length<=2)return d; if(d.length<=5)return d.replace(/^(\d{2})(\d+)$/,'$1.$2'); if(d.length<=8)return d.replace(/^(\d{2})(\d{3})(\d+)$/,'$1.$2.$3'); if(d.length<=12)return d.replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/,'$1.$2.$3/$4'); return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/,'$1.$2.$3/$4-$5'); };
const maskPhone= v => { const d=v.replace(/\D/g,'').slice(0,11); if(d.length<=2)return d.length?`(${d}`:''; if(d.length<=7)return d.replace(/^(\d{2})(\d+)$/,'($1) $2'); if(d.length<=10)return d.replace(/^(\d{2})(\d{4})(\d+)$/,'($1) $2-$3'); return d.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3'); };
const maskCEP  = v => { const d=v.replace(/\D/g,'').slice(0,8); if(d.length<=5)return d; return d.replace(/^(\d{5})(\d+)$/,'$1-$2'); };
const maskRG   = v => v.replace(/[^0-9Xx]/gi,'').slice(0,10);

const validateEmail = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const TIPOS_DOC = [{id:'cnh',label:'CNH'},{id:'crlv',label:'CRLV'},{id:'comprovante_endereco',label:'Comp. Endereço'},{id:'identidade',label:'RG/Identidade'},{id:'procuracao',label:'Procuração'},{id:'contrato',label:'Contrato'},{id:'outro',label:'Outro'}];
const STATUS_DOC = {pendente:{badge:'badge-amber',label:'Pendente'},aprovado:{badge:'badge-green',label:'Aprovado'},rejeitado:{badge:'badge-red',label:'Rejeitado'}};

export default function ClientesPage() {
  const toast = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [detailCliente, setDetailCliente] = useState(null);
  const [detailDocs, setDetailDocs] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [detailProcessoId, setDetailProcessoId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback((s='') => {
    setLoading(true);
    api.crm.getClients({search:s}).then(r=>{ if(r.success) setClientes(r.data); setLoading(false); });
  },[]);

  useEffect(()=>{ load(search); },[refreshKey]);

  const handleSearch = v => {
    setSearch(v);
    clearTimeout(window._st);
    window._st = setTimeout(()=>load(v),300);
  };

  const openDetail = async c => {
    const r = await api.crm.getClient(c.id);
    if(r.success){ setDetailCliente(r.data); loadDetailDocs(c.id); }
  };

  const loadDetailDocs = async clienteId => {
    const r = await api.docs.listByCliente(clienteId);
    if(r.success) setDetailDocs(r.data);
  };

  const handleSave = async data => {
    let r;
    if(data.id) r = await api.crm.updateClient(data);
    else        r = await api.crm.createClient(data);
    if(r.success){
      toast(data.id?'Cliente atualizado!':'Cliente criado!','success');
      setShowModal(false); setEditingCliente(null);
      setRefreshKey(k=>k+1);
    } else toast(r.error||'Erro ao salvar','error');
  };

  const handleUpload = async data => {
    const r = await api.docs.upload({...data, cliente_id: detailCliente.id, processo_id: detailProcessoId||null});
    if(r.success){ toast('Documento enviado!','success'); setShowUpload(false); loadDetailDocs(detailCliente.id); }
    else toast('Erro ao enviar','error');
  };

  const handleDocStatus = async (id, status) => {
    await api.docs.updateStatus({id,status});
    loadDetailDocs(detailCliente.id);
  };

  const handleDocDelete = async id => {
    if(!confirm('Remover documento?')) return;
    await api.docs.delete(id);
    loadDetailDocs(detailCliente.id);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Clientes</h1><p className="page-subtitle">{clientes.length} clientes cadastrados</p></div>
        <button className="btn btn-primary" onClick={()=>{setEditingCliente({});setShowModal(true);}}>
          <Icon name="plus" size={15}/> Novo Cliente
        </button>
      </div>

      <div style={{marginBottom:16,position:'relative',maxWidth:400}}>
        <Icon name="search" size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
        <input className="form-input" style={{paddingLeft:36}} placeholder="Buscar nome, CPF, telefone..."
          value={search} onChange={e=>handleSearch(e.target.value)}/>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nome</th><th>Tipo</th><th>CPF/CNPJ</th><th>Telefone</th><th>Cidade</th><th></th></tr></thead>
            <tbody>
              {loading&&<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>Carregando...</td></tr>}
              {!loading&&clientes.length===0&&<tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>Nenhum cliente encontrado</td></tr>}
              {clientes.map(c=>(
                <tr key={c.id} style={{cursor:'pointer'}} onClick={()=>openDetail(c)}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:'var(--accent-dim)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,flexShrink:0}}>
                        {c.nome.split(' ').slice(0,2).map(n=>n[0]).join('')}
                      </div>
                      <span style={{color:'var(--text-primary)',fontWeight:500}}>{c.nome}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${c.tipo==='PJ'?'badge-blue':'badge-gray'}`}>{c.tipo}</span></td>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{c.cpf_cnpj||'-'}</td>
                  <td>{c.telefone||'-'}</td>
                  <td>{c.cidade||'-'}</td>
                  <td>
                    <button className="btn btn-icon btn-ghost" onClick={e=>{e.stopPropagation();setEditingCliente(c);setShowModal(true);}}>
                      <Icon name="edit" size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal&&<ClienteModal initial={editingCliente} onSave={handleSave} onClose={()=>{setShowModal(false);setEditingCliente(null);}}/>}
      {detailCliente&&(
        <ClienteDetail
          cliente={detailCliente}
          docs={detailDocs}
          onClose={()=>setDetailCliente(null)}
          onEdit={()=>{setEditingCliente(detailCliente);setShowModal(true);setDetailCliente(null);}}
          onUploadDoc={()=>setShowUpload(true)}
          onDocStatus={handleDocStatus}
          onDocDelete={handleDocDelete}
          selectedProcessoId={detailProcessoId}
          onSelectProcesso={setDetailProcessoId}
        />
      )}
      {showUpload&&<UploadModal onUpload={handleUpload} onClose={()=>setShowUpload(false)}/>}
    </div>
  );
}

function ClienteModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({tipo:'PF',nome:'',cpf_cnpj:'',rg:'',email:'',telefone:'',whatsapp:'',cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'Ibiporã',estado:'PR',observacoes:'',...initial});
  const [emailErr, setEmailErr] = useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const handleCpfChange = v => set('cpf_cnpj', form.tipo==='PF' ? maskCPF(v) : maskCNPJ(v));
  const handleEmailChange = v => { set('email',v); setEmailErr(v&&!validateEmail(v)?'E-mail inválido':''); };

  const buscarCEP = async () => {
    const cep = form.cep.replace(/\D/g,'');
    if(cep.length!==8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if(!d.erro){ set('logradouro',d.logradouro); set('bairro',d.bairro); set('cidade',d.localidade); set('estado',d.uf); }
    } catch {}
  };

  const handleSubmit = e => {
    e.preventDefault();
    if(!form.nome.trim()){ alert('Nome é obrigatório'); return; }
    if(form.email&&!validateEmail(form.email)){ alert('E-mail inválido'); return; }
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e=>e.stopPropagation()} style={{maxHeight:'90vh'}}>
        <div className="modal-header">
          <h3>{initial?.id?'Editar Cliente':'Novo Cliente'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="tabs" style={{marginBottom:16}}>
            {['PF','PJ'].map(t=>(
              <button key={t} type="button" className={`tab-btn ${form.tipo===t?'active':''}`} onClick={()=>{set('tipo',t);set('cpf_cnpj','');}}>
                {t==='PF'?'Pessoa Física':'Pessoa Jurídica'}
              </button>
            ))}
          </div>
          <div className="form-grid form-grid-2" style={{gap:14}}>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Nome Completo / Razão Social *</label>
              <input className="form-input" required value={form.nome} maxLength={120} onChange={e=>set('nome',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">{form.tipo==='PF'?'CPF':'CNPJ'}</label>
              <input className="form-input" value={form.cpf_cnpj} inputMode="numeric"
                onChange={e=>handleCpfChange(e.target.value)} placeholder={form.tipo==='PF'?'000.000.000-00':'00.000.000/0001-00'}
                style={{fontFamily:'monospace'}}/>
            </div>
            {form.tipo==='PF'&&(
              <div className="form-group">
                <label className="form-label">RG <span style={{color:'var(--text-muted)',fontWeight:400}}>(máx 10 dígitos)</span></label>
                <input className="form-input" value={form.rg} maxLength={10}
                  onChange={e=>set('rg',maskRG(e.target.value))} placeholder="00.000.000-0" style={{fontFamily:'monospace'}}/>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={form.email} maxLength={120}
                onChange={e=>handleEmailChange(e.target.value)} placeholder="exemplo@email.com"
                style={{borderColor:emailErr?'var(--red)':''}}/>
              {emailErr&&<span style={{fontSize:11,color:'var(--red)',marginTop:2}}>{emailErr}</span>}
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
          </div>
          <div style={{marginTop:20,marginBottom:10,fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:1}}>ENDEREÇO</div>
          <div className="form-grid form-grid-3" style={{gap:14}}>
            <div className="form-group">
              <label className="form-label">CEP</label>
              <input className="form-input" value={form.cep} maxLength={9} inputMode="numeric"
                onChange={e=>set('cep',maskCEP(e.target.value))} onBlur={buscarCEP} placeholder="00000-000"/>
            </div>
            <div className="form-group" style={{gridColumn:'span 2'}}>
              <label className="form-label">Logradouro</label>
              <input className="form-input" value={form.logradouro} onChange={e=>set('logradouro',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Número</label>
              <input className="form-input" value={form.numero} maxLength={10} onChange={e=>set('numero',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Complemento</label>
              <input className="form-input" value={form.complemento} onChange={e=>set('complemento',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Bairro</label>
              <input className="form-input" value={form.bairro} onChange={e=>set('bairro',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input className="form-input" value={form.cidade} onChange={e=>set('cidade',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <input className="form-input" value={form.estado} maxLength={2} onChange={e=>set('estado',e.target.value.toUpperCase())}/>
            </div>
          </div>
          <div className="form-group" style={{marginTop:14}}>
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} maxLength={500} onChange={e=>set('observacoes',e.target.value)}/>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Cliente</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClienteDetail({ cliente, docs, onClose, onEdit, onUploadDoc, onDocStatus, onDocDelete, selectedProcessoId, onSelectProcesso }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e=>e.stopPropagation()} style={{maxHeight:'90vh'}}>
        <div className="modal-header">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),#d97706)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:16,color:'var(--bg-base)'}}>
              {cliente.nome.split(' ').slice(0,2).map(n=>n[0]).join('')}
            </div>
            <div><h3>{cliente.nome}</h3><span className="badge badge-gray">{cliente.tipo==='PJ'?'Pessoa Jurídica':'Pessoa Física'}</span></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary btn-sm" onClick={onUploadDoc}><Icon name="upload" size={13}/> Documento</button>
            <button className="btn btn-secondary btn-sm" onClick={onEdit}><Icon name="edit" size={13}/> Editar</button>
            <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
          {/* Dados */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:1,marginBottom:12}}>CONTATO</div>
            {[['CPF/CNPJ',cliente.cpf_cnpj],['RG',cliente.rg],['Telefone',cliente.telefone],['WhatsApp',cliente.whatsapp],['E-mail',cliente.email],['Cidade',cliente.cidade&&`${cliente.cidade}-${cliente.estado}`]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:13}}>
                <span style={{color:'var(--text-muted)'}}>{k}</span><span style={{fontWeight:500}}>{v}</span>
              </div>
            ))}
            {cliente.logradouro&&<div style={{fontSize:12,color:'var(--text-muted)',marginTop:8}}>{cliente.logradouro},{cliente.numero} — {cliente.bairro}, CEP {cliente.cep}</div>}

            {/* Processos */}
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:1,marginTop:20,marginBottom:12}}>PROCESSOS ({cliente.processos?.length||0})</div>
            {(!cliente.processos||cliente.processos.length===0)&&<div style={{fontSize:12,color:'var(--text-muted)'}}>Nenhum processo</div>}
            {(cliente.processos||[]).map(p=>(
              <div key={p.id} style={{padding:'8px 12px',background:selectedProcessoId===p.id?'var(--accent-dim)':'var(--bg-elevated)',borderRadius:'var(--radius)',marginBottom:6,cursor:'pointer',border:`1px solid ${selectedProcessoId===p.id?'rgba(240,165,0,0.3)':'var(--bg-border)'}`}}
                onClick={()=>onSelectProcesso(p.id===selectedProcessoId?'':p.id)}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span style={{fontWeight:600}}>{p.numero}</span>
                  <span className={`badge ${p.status==='concluido'?'badge-green':p.status==='cancelado'?'badge-red':'badge-amber'}`}>{p.status}</span>
                </div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{p.servico_nome} · {p.veiculo_placa}</div>
              </div>
            ))}
          </div>

          {/* Documentos */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:1}}>DOCUMENTOS ({docs.length})</div>
              <button className="btn btn-primary btn-sm" onClick={onUploadDoc}><Icon name="plus" size={12}/> Adicionar</button>
            </div>
            {docs.length===0&&(
              <div style={{textAlign:'center',padding:24,color:'var(--text-muted)',background:'var(--bg-elevated)',borderRadius:'var(--radius)',border:'2px dashed var(--bg-border)'}}>
                <Icon name="file" size={32}/><div style={{fontSize:12,marginTop:8}}>Nenhum documento.<br/>Clique em Adicionar.</div>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {docs.map(doc=>{
                const sm=STATUS_DOC[doc.status]||STATUS_DOC.pendente;
                const tipo=TIPOS_DOC.find(t=>t.id===doc.tipo);
                return (
                  <div key={doc.id} style={{padding:'10px 12px',background:'var(--bg-elevated)',borderRadius:'var(--radius)',display:'flex',alignItems:'center',gap:10}}>
                    <Icon name="file" size={20} color="var(--text-muted)"/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nome_original}</div>
                      <div style={{display:'flex',gap:4,marginTop:3}}>
                        <span className="badge badge-blue" style={{fontSize:10}}>{tipo?.label}</span>
                        <span className={`badge ${sm.badge}`} style={{fontSize:10}}>{sm.label}</span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:4,flexShrink:0}}>
                      {doc.status!=='aprovado'&&<button className="btn btn-sm" style={{background:'var(--green-dim)',color:'var(--green)',border:'1px solid rgba(34,197,94,0.2)',padding:'3px 6px'}} onClick={()=>onDocStatus(doc.id,'aprovado')}><Icon name="check" size={11}/></button>}
                      {doc.status!=='rejeitado'&&<button className="btn btn-danger btn-sm" style={{padding:'3px 6px'}} onClick={()=>onDocStatus(doc.id,'rejeitado')}><Icon name="x" size={11}/></button>}
                      <button className="btn btn-icon btn-ghost" style={{padding:4}} onClick={()=>onDocDelete(doc.id)}><Icon name="trash" size={12}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onUpload, onClose }) {
  const [tipo, setTipo] = useState('cnh');
  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');

  const selectFile = async () => {
    const p = await api.docs.selectFile();
    if(p){ setFilePath(p); setFileName(p.split(/[\\/]/).pop()); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>Enviar Documento</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={tipo} onChange={e=>setTipo(e.target.value)}>
              {TIPOS_DOC.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div style={{border:`2px dashed ${filePath?'var(--accent)':'var(--bg-border)'}`,borderRadius:'var(--radius-lg)',padding:24,textAlign:'center',cursor:'pointer',background:filePath?'var(--accent-dim)':'var(--bg-elevated)'}}
            onClick={selectFile}>
            {filePath?(<><Icon name="check" size={24} color="var(--accent)"/><div style={{marginTop:8,fontSize:13,color:'var(--accent)',fontWeight:600}}>{fileName}</div></>)
              :(<><Icon name="upload" size={28} color="var(--text-muted)"/><div style={{marginTop:8,fontSize:13,color:'var(--text-secondary)'}}>Clique para selecionar</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>PDF, JPG, PNG, DOC</div></>)}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!filePath}
            onClick={()=>onUpload({tipo,file_path:filePath,nome_original:fileName})}>
            <Icon name="upload" size={14}/> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
