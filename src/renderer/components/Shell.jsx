// src/renderer/components/Shell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useNav, api } from '../App';
import Icon from './Icon';

const NAV_ITEMS = [
  {id:'dashboard',  label:'Dashboard',      icon:'grid',     section:'Principal'},
  {id:'crm',        label:'Funil de Vendas',icon:'kanban',   section:'Principal'},
  {id:'clientes',   label:'Clientes',       icon:'users',    section:'Principal'},
  {id:'documentos', label:'Documentos',     icon:'file',     section:'Operação'},
  {id:'financeiro', label:'Financeiro',     icon:'dollar',   section:'Financeiro'},
  {id:'caixa',      label:'Caixa',          icon:'cash',     section:'Financeiro'},
  {id:'notas',      label:'Notas Fiscais',  icon:'receipt',  section:'Financeiro'},
  {id:'whatsapp',   label:'WhatsApp',       icon:'whatsapp', section:'Automação'},
  {id:'relatorios', label:'Relatórios',     icon:'chart',    section:'Relatórios'},
  {id:'config',     label:'Configurações',  icon:'settings', section:'Sistema'},
];

const isElectron = !!window.electronAPI;

export default function Shell({ children }) {
  const { session, logout } = useAuth();
  const { currentPage, navigate } = useNav();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const notifRef  = useRef(null);

  useEffect(()=>{
    api.notifications.getAll().then(r=>{ if(r.success) setNotifications(r.data); });
  },[]);

  // Close dropdowns on outside click
  useEffect(()=>{
    const handler = e => {
      if(notifRef.current&&!notifRef.current.contains(e.target)) setShowNotif(false);
      if(searchRef.current&&!searchRef.current.contains(e.target)){ setShowSearch(false); setSearchResults([]); }
    };
    document.addEventListener('mousedown',handler);
    return ()=>document.removeEventListener('mousedown',handler);
  },[]);

  const handleSearch = async v => {
    setSearchQuery(v);
    if(v.length>=2){
      const r = await api.crm.search(v);
      if(r.success){ setSearchResults(r.data); setShowSearch(true); }
    } else { setSearchResults([]); setShowSearch(false); }
  };

  const handleSearchSelect = tipo => {
    navigate(tipo==='lead'?'crm':'clientes');
    setSearchQuery(''); setSearchResults([]); setShowSearch(false);
  };

  const unread = notifications.filter(n=>!n.lida).length;
  const sections = NAV_ITEMS.reduce((acc,item)=>{ if(!acc[item.section])acc[item.section]=[]; acc[item.section].push(item); return acc; },{});
  const initials = session.usuario.nome.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();

  return (
    <div className="app-shell">
      {/* ── Titlebar ── */}
      <header className="titlebar">
        <div className="titlebar-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#f0a500" strokeWidth="2" fill="none"/>
            <path d="M9 22V12h6v10" stroke="#f0a500" strokeWidth="2"/>
          </svg>
          DespachaPR <span>v1.0</span>
        </div>

        {/* Search */}
        <div className="titlebar-search" ref={searchRef}>
          <div className="search-wrapper" style={{position:'relative'}}>
            <Icon name="search" size={14} className="search-icon"/>
            <input className="search-box" placeholder="Buscar cliente, lead, placa, CPF..."
              value={searchQuery} onChange={e=>handleSearch(e.target.value)}
              onFocus={()=>searchResults.length>0&&setShowSearch(true)}/>
            {showSearch&&searchResults.length>0&&(
              <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:500,background:'var(--bg-elevated)',border:'1px solid var(--bg-border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow-lg)',overflow:'hidden'}}>
                {searchResults.map(r=>(
                  <div key={r.id}
                    style={{padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,borderBottom:'1px solid var(--bg-border)'}}
                    onMouseDown={()=>handleSearchSelect(r.tipo)}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}
                  >
                    <span className={`badge ${r.tipo==='lead'?'badge-amber':'badge-blue'}`} style={{fontSize:10}}>{r.tipo}</span>
                    <span style={{color:'var(--text-primary)',fontWeight:500,flex:1}}>{r.nome}</span>
                    {r.tipo==='lead'&&<span className="badge badge-gray" style={{fontSize:10}}>{r.etapa}</span>}
                    <span style={{color:'var(--text-muted)',fontSize:12}}>{r.telefone}</span>
                  </div>
                ))}
              </div>
            )}
            {showSearch&&searchResults.length===0&&searchQuery.length>=2&&(
              <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:500,background:'var(--bg-elevated)',border:'1px solid var(--bg-border)',borderRadius:'var(--radius)',padding:'14px',fontSize:13,color:'var(--text-muted)',textAlign:'center',boxShadow:'var(--shadow-lg)'}}>
                Nenhum resultado para "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        <div className="titlebar-spacer"/>

        {/* Notifications */}
        <div style={{position:'relative'}} ref={notifRef}>
          <button className="win-btn" onClick={()=>setShowNotif(v=>!v)} style={{position:'relative'}}>
            <Icon name="bell" size={16}/>
            {unread>0&&<span style={{position:'absolute',top:3,right:3,background:'var(--red)',color:'white',fontSize:9,width:14,height:14,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{unread}</span>}
          </button>
          {showNotif&&(
            <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:500,background:'var(--bg-elevated)',border:'1px solid var(--bg-border)',borderRadius:'var(--radius-lg)',minWidth:300,boxShadow:'var(--shadow-lg)',overflow:'hidden'}}>
              <div style={{padding:'10px 14px',fontWeight:700,fontSize:13,borderBottom:'1px solid var(--bg-border)'}}>Notificações</div>
              {notifications.length===0&&<div style={{padding:20,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Sem notificações</div>}
              {notifications.map(n=>(
                <div key={n.id} style={{padding:'10px 14px',background:n.lida?'':'var(--accent-dim)',borderLeft:n.lida?'':'2px solid var(--accent)',borderBottom:'1px solid var(--bg-border)'}}>
                  <div style={{fontWeight:600,fontSize:13,color:'var(--text-primary)'}}>{n.titulo}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{n.mensagem}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Window controls — só no Electron */}
        {isElectron&&(
          <div className="titlebar-actions">
            <button className="win-btn" onClick={()=>api.window.minimize()}><Icon name="minus" size={14}/></button>
            <button className="win-btn" onClick={()=>api.window.maximize()}><Icon name="square" size={13}/></button>
            <button className="win-btn close" onClick={()=>api.window.close()}><Icon name="x" size={14}/></button>
          </div>
        )}
      </header>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {Object.entries(sections).map(([section,items])=>(
          <div key={section} className="sidebar-section">
            <div className="sidebar-section-label">{section}</div>
            {items.map(item=>(
              <button key={item.id} className={`nav-item ${currentPage===item.id?'active':''}`} onClick={()=>navigate(item.id)}>
                <Icon name={item.icon} size={16}/>{item.label}
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-footer">
          <div className="user-chip" onClick={logout} title="Clique para sair">
            <div className="user-avatar">{initials}</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{session.usuario.nome.split(' ')[0]}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{session.usuario.perfil==='admin'?'Administrador':'Operador'}</div>
            </div>
            <Icon name="logout" size={14} style={{marginLeft:'auto',color:'var(--text-muted)'}}/>
          </div>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="main-content">{children}</main>
    </div>
  );
}
