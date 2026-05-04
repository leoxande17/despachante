// src/renderer/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../App';
import Icon from '../components/Icon';
import { useNav } from '../App';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function Dashboard() {
  const { navigate } = useNav();
  const [finData, setFinData] = useState(null);
  const [relData, setRelData] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.financeiro.getDashboard(),
      api.relatorios.dashboard(),
      api.caixa.getAtual(),
      api.crm.getLeads({ etapa: 'novo' }),
    ]).then(([fin, rel, cx, lds]) => {
      if (fin.success) setFinData(fin.data);
      if (rel.success) setRelData(rel.data);
      if (cx.success) setCaixa(cx.data);
      if (lds.success) setLeads(lds.data.slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="empty-state">Carregando dashboard...</div>;

  const maxVal = relData?.vendasMes ? Math.max(...relData.vendasMes.map(v => v.valor)) : 1;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('caixa')}>
            <Icon name="cash" size={14} /> Caixa do Dia
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('crm')}>
            <Icon name="plus" size={14} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Receita do Mês"
          value={fmt(finData?.receitaMes)}
          icon="arrowUp" iconBg="var(--green-dim)" iconColor="var(--green)"
          delta={`+${fmt(finData?.saldoMes)} de saldo`}
        />
        <StatCard
          label="A Receber"
          value={fmt(finData?.totalReceber)}
          icon="dollar" iconBg="var(--accent-dim)" iconColor="var(--accent)"
          delta={finData?.inadimplentes > 0 ? `${finData.inadimplentes} em atraso` : 'Tudo em dia'}
          deltaClass={finData?.inadimplentes > 0 ? 'negative' : ''}
        />
        <StatCard
          label="Caixa Hoje"
          value={caixa?.status === 'aberto' ? 'Aberto' : 'Fechado'}
          icon="cash" iconBg="var(--blue-dim)" iconColor="var(--blue)"
          delta={caixa?.status === 'aberto' ? 'Caixa aberto' : 'Caixa não aberto'}
        />
        <StatCard
          label="Leads Abertos"
          value={leads.length + '+'}
          icon="kanban" iconBg="rgba(168,85,247,0.12)" iconColor="#a855f7"
          delta="Novos leads aguardando"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Revenue bar chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3>Receita Mensal</h3>
            <span className="badge badge-green">Últimos 6 meses</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, paddingBottom: 24, position: 'relative' }}>
            {/* Y axis lines */}
            {[0, 25, 50, 75, 100].map(pct => (
              <div key={pct} style={{
                position: 'absolute', bottom: 24 + pct * 1.36, left: 0, right: 0,
                borderTop: '1px dashed var(--bg-border)', pointerEvents: 'none'
              }} />
            ))}
            {(relData?.vendasMes || []).map((m, i) => {
              const h = Math.round((m.valor / maxVal) * 136);
              return (
                <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
                  <div style={{
                    width: '100%', height: h,
                    background: i === (relData.vendasMes.length - 1)
                      ? 'linear-gradient(180deg, var(--accent), #d97706)'
                      : 'var(--bg-elevated)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s ease',
                    border: '1px solid var(--bg-border)',
                    position: 'relative',
                    cursor: 'default',
                  }}
                  title={fmt(m.valor)}
                  />
                  <span style={{ position: 'absolute', bottom: 0, fontSize: 11, color: 'var(--text-muted)' }}>{m.mes}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top services */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Serviços Populares</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(relData?.servicosTop || []).map((s, i) => {
              const maxCount = Math.max(...(relData.servicosTop.map(x => x.total)));
              const pct = Math.round((s.total / maxCount) * 100);
              return (
                <div key={s.nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{s.nome}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.total} serv.</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: i === 0 ? 'var(--accent)' : 'var(--blue)',
                      borderRadius: 3, transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent leads */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Novos Leads</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('crm')}>Ver todos →</button>
          </div>
          {leads.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <Icon name="users" size={32} />
              <p>Nenhum lead novo</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {leads.map(l => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius)', cursor: 'pointer'
                }}
                onClick={() => navigate('crm')}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--accent-dim)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13
                  }}>
                    {l.nome.split(' ').slice(0,2).map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{l.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.servico_interesse} · {l.telefone}</div>
                  </div>
                  <span className={`badge badge-${l.origem === 'whatsapp' ? 'green' : l.origem === 'indicacao' ? 'blue' : 'gray'}`}>
                    {l.origem}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversion + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Conversion rate */}
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 16 }}>Taxa de Conversão</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--accent)" strokeWidth="8"
                    strokeDasharray={`${201.06 * (relData?.leadsConversao?.taxa ?? 0) / 100} 201.06`}
                    strokeDashoffset="50.26" strokeLinecap="round"
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--accent)'
                }}>
                  {relData?.leadsConversao?.taxa ?? 0}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Leads convertidos em clientes</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total leads</div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18 }}>{relData?.leadsConversao?.total ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fechados</div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--green)' }}>{relData?.leadsConversao?.fechados ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Ações Rápidas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Novo Lead', icon: 'plus', page: 'crm', color: 'var(--accent)' },
                { label: 'Lançamento', icon: 'dollar', page: 'financeiro', color: 'var(--green)' },
                { label: 'Documento', icon: 'file', page: 'documentos', color: 'var(--blue)' },
                { label: 'Nota Fiscal', icon: 'receipt', page: 'notas', color: '#a855f7' },
              ].map(a => (
                <button key={a.label} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}
                  onClick={() => navigate(a.page)}>
                  <Icon name={a.icon} size={14} color={a.color} />
                  <span style={{ fontSize: 12 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, iconBg, iconColor, delta, deltaClass }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon name={icon} size={18} color={iconColor} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta && <div className={`stat-delta ${deltaClass || ''}`}>{delta}</div>}
    </div>
  );
}
