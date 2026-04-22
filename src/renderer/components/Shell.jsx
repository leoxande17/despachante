// src/renderer/components/Shell.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, useNav, api } from '../App';
import Icon from './Icon';

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',       icon: 'grid',       section: 'Principal' },
  { id: 'crm',        label: 'Funil de Vendas',  icon: 'kanban',     section: 'Principal' },
  { id: 'clientes',   label: 'Clientes',         icon: 'users',      section: 'Principal' },
  { id: 'documentos', label: 'Documentos',       icon: 'file',       section: 'Operação' },
  { id: 'financeiro', label: 'Financeiro',       icon: 'dollar',     section: 'Financeiro' },
  { id: 'caixa',      label: 'Caixa',            icon: 'cash',       section: 'Financeiro' },
  { id: 'notas',      label: 'Notas Fiscais',    icon: 'receipt',    section: 'Financeiro' },
  { id: 'whatsapp',   label: 'WhatsApp',         icon: 'whatsapp',   section: 'Automação' },
  { id: 'relatorios', label: 'Relatórios',       icon: 'chart',      section: 'Relatórios' },
  { id: 'config',     label: 'Configurações',    icon: 'settings',   section: 'Sistema' },
];

export default function Shell({ children }) {
  const { session, logout } = useAuth();
  const { currentPage, navigate } = useNav();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    api.notifications.getAll().then(res => {
      if (res.success) setNotifications(res.data);
    });
  }, []);

  // Group nav items by section
  const sections = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const unreadNotifs = notifications.filter(n => !n.lida).length;

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      const res = await api.crm.search(q);
      if (res.success) setSearchResults(res.data);
    } else {
      setSearchResults([]);
    }
  };

  const initials = session.usuario.nome
    .split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();

  return (
    <div className="app-shell">
      {/* ─── Titlebar ─────────────────────────────── */}
      <header className="titlebar">
        <div className="titlebar-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#f0a500" strokeWidth="2" fill="none"/>
            <path d="M9 22V12h6v10" stroke="#f0a500" strokeWidth="2"/>
          </svg>
          DespachaPR <span>v1.0</span>
        </div>

        <div className="titlebar-search">
          <div className="search-wrapper">
            <Icon name="search" size={14} className="search-icon" />
            <input
              className="search-box"
              placeholder="Buscar cliente, placa, CPF..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500,
                background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
                borderRadius: 'var(--radius)', marginTop: 4, overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
              }}>
                {searchResults.map(r => (
                  <div key={r.id} style={{
                    padding: '9px 12px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 10, borderBottom: '1px solid var(--bg-border)',
                    fontSize: 13
                  }}
                  onMouseDown={() => { navigate(r.tipo === 'lead' ? 'crm' : 'clientes'); setSearchQuery(''); setSearchResults([]); }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span className={`badge ${r.tipo === 'lead' ? 'badge-amber' : 'badge-blue'}`}>{r.tipo === 'lead' ? 'Lead' : 'Cliente'}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{r.nome}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{r.telefone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="titlebar-spacer" />

        {/* Notifications */}
        <div style={{ position: 'relative', WebkitAppRegion: 'no-drag' }}>
          <button className="win-btn" onClick={() => setShowNotif(!showNotif)} style={{ position: 'relative' }}>
            <Icon name="bell" size={16} />
            {unreadNotifs > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: 'var(--red)', color: 'white',
                fontSize: 9, width: 14, height: 14,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700
              }}>{unreadNotifs}</span>
            )}
          </button>

          {showNotif && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, zIndex: 500,
              background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
              borderRadius: 'var(--radius-lg)', padding: 8, minWidth: 300,
              boxShadow: 'var(--shadow-lg)', marginTop: 4
            }}>
              <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--bg-border)', marginBottom: 4 }}>
                Notificações
              </div>
              {notifications.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sem notificações</div>
              )}
              {notifications.map(n => (
                <div key={n.id} style={{
                  padding: '10px 12px', borderRadius: 'var(--radius)', cursor: 'pointer',
                  background: n.lida ? '' : 'var(--accent-dim)',
                  borderLeft: n.lida ? '' : '2px solid var(--accent)',
                  marginBottom: 2
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{n.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.mensagem}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Window controls */}
        <div className="titlebar-actions">
          <button className="win-btn" onClick={() => api.window?.minimize()}>
            <Icon name="minus" size={14} />
          </button>
          <button className="win-btn" onClick={() => api.window?.maximize()}>
            <Icon name="square" size={13} />
          </button>
          <button className="win-btn close" onClick={() => api.window?.close()}>
            <Icon name="x" size={14} />
          </button>
        </div>
      </header>

      {/* ─── Sidebar ──────────────────────────────── */}
      <aside className="sidebar">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="sidebar-section">
            <div className="sidebar-section-label">{section}</div>
            {items.map(item => (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="user-chip" onClick={logout} title="Sair">
            <div className="user-avatar">{initials}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {session.usuario.nome.split(' ')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {session.usuario.perfil === 'admin' ? 'Administrador' : 'Operador'}
              </div>
            </div>
            <Icon name="logout" size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
          </div>
        </div>
      </aside>

      {/* ─── Content ──────────────────────────────── */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
