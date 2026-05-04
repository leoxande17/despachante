// src/renderer/pages/ConfigPage.jsx — Novo usuário funcional + permissões
import React, { useState, useEffect } from 'react';
import { api, useAuth, useToast } from '../App';
import Icon from '../components/Icon';

const PERMISSOES = [
  {id:'crm',        label:'Funil de Vendas'},
  {id:'clientes',   label:'Clientes'},
  {id:'documentos', label:'Documentos'},
  {id:'financeiro', label:'Financeiro'},
  {id:'caixa',      label:'Caixa'},
  {id:'notas',      label:'Notas Fiscais'},
  {id:'relatorios', label:'Relatórios'},
  {id:'whatsapp',   label:'WhatsApp'},
  {id:'excluir',    label:'Excluir registros'},
  {id:'emitir_nf',  label:'Emitir NF-e'},
  {id:'backup',     label:'Realizar backup'},
];

const maskCNPJ = v => {
  const d = v.replace(/\D/g,'').slice(0,14);
  if(d.length<=2) return d;
  if(d.length<=5) return d.replace(/^(\d{2})(\d+)$/,'$1.$2');
  if(d.length<=8) return d.replace(/^(\d{2})(\d{3})(\d+)$/,'$1.$2.$3');
  if(d.length<=12) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/,'$1.$2.$3/$4');
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/,'$1.$2.$3/$4-$5');
};
const maskPhone = v => {
  const d = v.replace(/\D/g,'').slice(0,11);
  if(d.length<=2) return d.length ? `(${d}` : '';
  if(d.length<=7) return d.replace(/^(\d{2})(\d+)$/,'($1) $2');
  if(d.length<=10) return d.replace(/^(\d{2})(\d{4})(\d+)$/,'($1) $2-$3');
  return d.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3');
};
const maskCEP = v => {
  const d = v.replace(/\D/g,'').slice(0,8);
  return d.length<=5 ? d : d.replace(/^(\d{5})(\d+)$/,'$1-$2');
};

export default function ConfigPage() {
  const { session } = useAuth();
  const toast = useToast();
  const isAdmin = session.usuario.perfil === 'admin';
  const [tab, setTab] = useState('empresa');
  const [senhaForm, setSenhaForm] = useState({atual:'',nova:'',confirmar:''});
  const [empresa, setEmpresa] = useState({
    nome:'DespachaPR Serviços', cnpj:'', inscricaoMunicipal:'',
    logradouro:'Rua das Flores, 100 - Centro', cidade:'Ibiporã', cep:'86200-000',
    telefone:'(43) 3252-0000', email:'contato@despachapr.com'
  });
  const [nfsConfig, setNfsConfig] = useState({url:'',token:'',cnpjPrestador:'',inscricaoMunicipal:''});
  const [usuarios, setUsuarios] = useState([]);
  const [showNovoUser, setShowNovoUser] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(()=>{
    if(isAdmin){ api.auth.listUsers(session.token).then(r=>{ if(r.success) setUsuarios(r.data); }); }
  },[isAdmin, refreshKey, session.token]);

  useEffect(()=>{
    api.system.getSettings('empresa').then(r=>{ if(r.success && r.data) setEmpresa(r.data); });
    api.system.getSettings('nfse').then(r=>{ if(r.success && r.data) setNfsConfig(r.data); });
  },[]);

  const handleChangeSenha = async () => {
    if(senhaForm.nova!==senhaForm.confirmar){ toast('As senhas não conferem','error'); return; }
    if(senhaForm.nova.length<6){ toast('Senha deve ter ao menos 6 caracteres','error'); return; }
    const r = await api.auth.changePassword({token:session.token, senhaAtual:senhaForm.atual, novaSenha:senhaForm.nova});
    if(r.success){ toast('Senha alterada com sucesso!','success'); setSenhaForm({atual:'',nova:'',confirmar:''}); }
    else toast(r.error||'Erro ao alterar senha','error');
  };

  const handleSaveUser = async data => {
    let r;
    const payload = {...data, token:session.token};
    if(data.id) r = await api.auth.updateUser(payload);
    else        r = await api.auth.createUser(payload);
    if(r.success){ toast(data.id?'Usuário atualizado!':'Usuário criado!','success'); setShowNovoUser(false); setEditUser(null); setRefreshKey(k=>k+1); }
    else toast(r.error||'Erro ao salvar usuário','error');
  };

  const handleDeleteUser = async id => {
    if(!confirm('Remover usuário?')) return;
    const r = await api.auth.deleteUser({id, token:session.token});
    if(r.success){ toast('Usuário removido','info'); setRefreshKey(k=>k+1); }
  };

  const handleSaveEmpresa = async () => {
    const r = await api.system.setSettings({key:'empresa', value:empresa});
    if(r.success) toast('Dados da empresa salvos!','success');
    else toast(r.error||'Erro ao salvar dados da empresa','error');
  };

  const handleSaveNfse = async () => {
    const r = await api.system.setSettings({key:'nfse', value:nfsConfig});
    if(r.success) toast('Config NFS-e salva!','success');
    else toast(r.error||'Erro ao salvar NFS-e','error');
  };

  const handleExportLogs = async () => {
    const r = await api.log.export();
    if(r.success) toast('Logs exportados!','success');
    else if(r.error) toast(r.error,'error');
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Configurações</h1><p className="page-subtitle">Ajustes do sistema e integrações</p></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:20}}>
        {/* Sidebar */}
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          {[
            {id:'empresa',   label:'Dados da Empresa', icon:'store'},
            {id:'nfse',      label:'NFS-e',            icon:'receipt'},
            {id:'seguranca', label:'Segurança',        icon:'lock'},
            {id:'backup',    label:'Backup',           icon:'backup'},
            {id:'sistema',   label:'Sistema',          icon:'settings'},
          ].map(t=>(
            <button key={t.id} className={`nav-item ${tab===t.id?'active':''}`} style={{textAlign:'left',width:'100%'}} onClick={()=>setTab(t.id)}>
              <Icon name={t.icon} size={15}/>{t.label}
            </button>
          ))}
        </div>

        <div>
          {/* ── Empresa ── */}
          {tab==='empresa'&&(
            <div className="card">
              <h3 style={{marginBottom:20}}>Dados da Empresa</h3>
              <div className="form-grid form-grid-2" style={{gap:14}}>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Razão Social</label>
                  <input className="form-input" value={empresa.nome} maxLength={140} onChange={e=>setEmpresa(f=>({...f,nome:e.target.value}))}/>
                </div>
                <div className="form-group"><label className="form-label">CNPJ</label><input className="form-input" value={empresa.cnpj} maxLength={18} onChange={e=>setEmpresa(f=>({...f,cnpj:maskCNPJ(e.target.value)}))} placeholder="00.000.000/0001-00"/></div>
                <div className="form-group"><label className="form-label">Inscrição Municipal</label><input className="form-input" value={empresa.inscricaoMunicipal} maxLength={30} onChange={e=>setEmpresa(f=>({...f,inscricaoMunicipal:e.target.value}))}/></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Endereço</label><input className="form-input" value={empresa.logradouro} maxLength={180} onChange={e=>setEmpresa(f=>({...f,logradouro:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" value={empresa.cidade} maxLength={80} onChange={e=>setEmpresa(f=>({...f,cidade:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">CEP</label><input className="form-input" value={empresa.cep} maxLength={9} onChange={e=>setEmpresa(f=>({...f,cep:maskCEP(e.target.value)}))}/></div>
                <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={empresa.telefone} maxLength={16} onChange={e=>setEmpresa(f=>({...f,telefone:maskPhone(e.target.value)}))}/></div>
                <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={empresa.email} maxLength={120} onChange={e=>setEmpresa(f=>({...f,email:e.target.value}))}/></div>
              </div>
              <div style={{marginTop:20}}><button className="btn btn-primary" onClick={handleSaveEmpresa}>Salvar Dados</button></div>
            </div>
          )}

          {/* ── NFS-e ── */}
          {tab==='nfse'&&(
            <div className="card">
              <h3 style={{marginBottom:8}}>Integração NFS-e</h3>
              <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:16}}>Configuração para emissão de notas via API da Prefeitura de Ibiporã-PR.</p>
              <div style={{padding:12,background:'var(--accent-dim)',borderRadius:'var(--radius)',marginBottom:16,fontSize:13,border:'1px solid rgba(240,165,0,0.2)'}}>
                <strong>Ibiporã — PR</strong> · IBGE 4109708 · ISS padrão 5%
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div className="form-group"><label className="form-label">URL da API</label><input className="form-input" value={nfsConfig.url} onChange={e=>setNfsConfig(f=>({...f,url:e.target.value}))} placeholder="https://nfse.ibipora.pr.gov.br/api/v1"/></div>
                <div className="form-group"><label className="form-label">Token de Autenticação</label><input className="form-input" type="password" value={nfsConfig.token} onChange={e=>setNfsConfig(f=>({...f,token:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">CNPJ do Prestador</label><input className="form-input" value={nfsConfig.cnpjPrestador} onChange={e=>setNfsConfig(f=>({...f,cnpjPrestador:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Inscrição Municipal</label><input className="form-input" value={nfsConfig.inscricaoMunicipal} onChange={e=>setNfsConfig(f=>({...f,inscricaoMunicipal:e.target.value}))}/></div>
              </div>
              <div style={{marginTop:20,display:'flex',gap:8}}>
                <button className="btn btn-primary" onClick={handleSaveNfse}>Salvar</button>
                <button className="btn btn-secondary" onClick={()=>toast('Conexão testada — modo demo','info')}><Icon name="refresh" size={14}/> Testar Conexão</button>
              </div>
            </div>
          )}

          {/* ── Segurança ── */}
          {tab==='seguranca'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {/* Alterar senha */}
              <div className="card">
                <h3 style={{marginBottom:16}}>Alterar Senha</h3>
                <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:380}}>
                  <div className="form-group"><label className="form-label">Senha Atual</label><input className="form-input" type="password" value={senhaForm.atual} onChange={e=>setSenhaForm(f=>({...f,atual:e.target.value}))}/></div>
                  <div className="form-group"><label className="form-label">Nova Senha</label><input className="form-input" type="password" value={senhaForm.nova} onChange={e=>setSenhaForm(f=>({...f,nova:e.target.value}))}/></div>
                  <div className="form-group"><label className="form-label">Confirmar Nova Senha</label><input className="form-input" type="password" value={senhaForm.confirmar} onChange={e=>setSenhaForm(f=>({...f,confirmar:e.target.value}))}/></div>
                  <button className="btn btn-primary" style={{width:'fit-content'}} onClick={handleChangeSenha}><Icon name="lock" size={14}/> Alterar Senha</button>
                </div>
              </div>

              {/* Usuários (admin only) */}
              {isAdmin&&(
                <div className="card">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                    <h3>Usuários do Sistema</h3>
                    <button className="btn btn-primary btn-sm" onClick={()=>{setEditUser(null);setShowNovoUser(true);}}>
                      <Icon name="plus" size={13}/> Novo Usuário
                    </button>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {usuarios.map(u=>(
                      <div key={u.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',background:'var(--bg-elevated)',borderRadius:'var(--radius)'}}>
                        <div style={{width:36,height:36,borderRadius:'50%',background:'var(--accent-dim)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,flexShrink:0}}>
                          {u.nome.split(' ').slice(0,2).map(n=>n[0]).join('')}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                            <span style={{fontWeight:600,fontSize:13}}>{u.nome}</span>
                            <span className={`badge ${u.perfil==='admin'?'badge-amber':'badge-blue'}`}>{u.perfil}</span>
                            {!u.ativo&&<span className="badge badge-red">inativo</span>}
                          </div>
                          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:6}}>{u.email}</div>
                          {/* Permissões */}
                          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                            {u.perfil==='admin'
                              ? <span className="badge badge-amber" style={{fontSize:10}}>Acesso Total</span>
                              : (u.permissoes||[]).map(p=>{
                                  const pm = PERMISSOES.find(x=>x.id===p);
                                  return pm ? <span key={p} className="badge badge-gray" style={{fontSize:10}}>{pm.label}</span> : null;
                                })
                            }
                          </div>
                        </div>
                        <div style={{display:'flex',gap:4}}>
                          {u.id!==session.usuario.id&&(
                            <>
                              <button className="btn btn-icon btn-ghost" onClick={()=>{setEditUser(u);setShowNovoUser(true);}}><Icon name="edit" size={14}/></button>
                              <button className="btn btn-icon btn-ghost" style={{color:'var(--red)'}} onClick={()=>handleDeleteUser(u.id)}><Icon name="trash" size={14}/></button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Backup ── */}
          {tab==='backup'&&(
            <div className="card">
              <h3 style={{marginBottom:8}}>Backup do Sistema</h3>
              <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:24,lineHeight:1.7}}>
                Exporta banco de dados + documentos em .zip. Recomendado fazer diariamente.
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                {[
                  {label:'Backup Completo',desc:'Banco + todos documentos',primary:true},
                  {label:'Só o Banco',     desc:'Apenas o arquivo .db',  primary:false},
                ].map(b=>(
                  <div key={b.label} style={{padding:20,background:b.primary?'var(--accent-dim)':'var(--bg-elevated)',borderRadius:'var(--radius-lg)',border:`1px solid ${b.primary?'rgba(240,165,0,0.2)':'var(--bg-border)'}`}}>
                    <Icon name="backup" size={28} color={b.primary?'var(--accent)':'var(--text-muted)'}/>
                    <div style={{fontWeight:700,marginTop:10,marginBottom:4}}>{b.label}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>{b.desc}</div>
                    <button className={`btn ${b.primary?'btn-primary':'btn-secondary'} btn-sm`} onClick={()=>api.system.backup()}>Fazer Backup</button>
                  </div>
                ))}
              </div>
              <div style={{padding:12,background:'var(--bg-elevated)',borderRadius:'var(--radius)',fontSize:13,color:'var(--text-muted)'}}>
                <Icon name="info" size={14} color="var(--blue)" style={{display:'inline',verticalAlign:'middle',marginRight:6}}/>
                Salve os backups em disco externo ou nuvem (Google Drive, OneDrive).
              </div>
            </div>
          )}

          {/* ── Sistema ── */}
          {tab==='sistema'&&(
            <div className="card">
              <h3 style={{marginBottom:20}}>Informações do Sistema</h3>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  ['Versão','DespachaPR v1.0.0'],
                  ['Plataforma','Windows (Electron + React)'],
                  ['Banco de dados','SQLite — offline-first'],
                  ['Usuário logado',`${session.usuario.nome} (${session.usuario.perfil})`],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'var(--bg-elevated)',borderRadius:'var(--radius)',fontSize:13}}>
                    <span style={{color:'var(--text-muted)'}}>{k}</span>
                    <span style={{fontWeight:500,fontFamily:'monospace',fontSize:12}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:20,display:'flex',gap:8}}>
                <button className="btn btn-secondary btn-sm" onClick={handleExportLogs}><Icon name="download" size={13}/> Exportar Logs</button>
                <button className="btn btn-danger btn-sm" onClick={()=>toast('Cache limpo!','success')}><Icon name="trash" size={13}/> Limpar Cache</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNovoUser&&(
        <NovoUsuarioModal
          initial={editUser}
          onSave={handleSaveUser}
          onClose={()=>{setShowNovoUser(false);setEditUser(null);}}
        />
      )}
    </div>
  );
}

function NovoUsuarioModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    nome:'', email:'', senha:'', perfil:'operador', ativo:1,
    permissoes: ['crm','clientes','documentos'],
    ...initial,
    senha: '',
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const togglePerm = id => {
    setForm(f=>({...f, permissoes: f.permissoes.includes(id) ? f.permissoes.filter(p=>p!==id) : [...f.permissoes,id]}));
  };

  const handleSubmit = e => {
    e.preventDefault();
    if(!form.nome.trim()){ alert('Nome obrigatório'); return; }
    if(!initial?.id && form.senha.length<6){ alert('Senha deve ter ao menos 6 caracteres'); return; }
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial?.id?'Editar Usuário':'Novo Usuário'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-grid form-grid-2" style={{gap:14}}>
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input className="form-input" required value={form.nome} maxLength={100} onChange={e=>set('nome',e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input className="form-input" required type="email" value={form.email} onChange={e=>set('email',e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">{initial?.id?'Nova Senha (deixe vazio para manter)':'Senha *'}</label>
                <input className="form-input" type="password" value={form.senha} minLength={initial?.id?0:6}
                  onChange={e=>set('senha',e.target.value)} placeholder={initial?.id?'••••••••':'mínimo 6 caracteres'}/>
              </div>
              <div className="form-group">
                <label className="form-label">Perfil</label>
                <select className="form-select" value={form.perfil} onChange={e=>set('perfil',e.target.value)}>
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            {form.perfil==='operador'&&(
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',letterSpacing:1,marginBottom:12}}>PERMISSÕES DO OPERADOR</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {PERMISSOES.map(p=>(
                    <label key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:form.permissoes.includes(p.id)?'var(--accent-dim)':'var(--bg-elevated)',borderRadius:'var(--radius)',cursor:'pointer',border:`1px solid ${form.permissoes.includes(p.id)?'rgba(240,165,0,0.25)':'var(--bg-border)'}`,fontSize:12,fontWeight:500}}>
                      <input type="checkbox" checked={form.permissoes.includes(p.id)} onChange={()=>togglePerm(p.id)} style={{accentColor:'var(--accent)'}}/>
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
                <input type="checkbox" checked={form.ativo===1} onChange={e=>set('ativo',e.target.checked?1:0)} style={{accentColor:'var(--accent)'}}/>
                Usuário ativo
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{initial?.id?'Salvar Alterações':'Criar Usuário'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
