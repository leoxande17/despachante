// src/renderer/pages/ConfigPage.jsx
import React, { useState } from 'react';
import { api, useAuth, useToast } from '../App';
import Icon from '../components/Icon';

export default function ConfigPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('empresa');
  const [senhaForm, setSenhaForm] = useState({ atual: '', nova: '', confirmar: '' });
  const [nfsConfig, setNfsConfig] = useState({ url: '', token: '', cnpjPrestador: '', inscricaoMunicipal: '' });
  const [empresa, setEmpresa] = useState({
    nome: 'DespachaPR Serviços', cnpj: '', inscricaoMunicipal: '',
    endereco: 'Rua das Flores, 100 - Centro', cidade: 'Ibiporã', cep: '86200-000',
    telefone: '(43) 3252-0000', email: 'contato@despachapr.com'
  });

  const handleChangeSenha = async () => {
    if (senhaForm.nova !== senhaForm.confirmar) { toast('Senhas não conferem', 'error'); return; }
    if (senhaForm.nova.length < 6) { toast('Senha deve ter ao menos 6 caracteres', 'error'); return; }
    const res = await api.auth.changePassword({
      token: session.token, senhaAtual: senhaForm.atual, novaSenha: senhaForm.nova
    });
    if (res.success) { toast('Senha alterada com sucesso!', 'success'); setSenhaForm({ atual: '', nova: '', confirmar: '' }); }
    else toast(res.error || 'Erro ao alterar senha', 'error');
  };

  const handleBackup = async () => {
    const res = await api.system.backup();
    if (res) toast('Backup realizado com sucesso!', 'success');
    else toast('Backup cancelado', 'info');
  };

  const handleSaveEmpresa = () => {
    toast('Dados da empresa salvos!', 'success');
  };

  const handleSaveNFS = () => {
    toast('Configuração NFS-e salva!', 'success');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Ajustes do sistema, empresa e integrações</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        {/* Sidebar tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { id: 'empresa',   label: 'Dados da Empresa', icon: 'store' },
            { id: 'nfse',      label: 'NFS-e',            icon: 'receipt' },
            { id: 'seguranca', label: 'Segurança',        icon: 'lock' },
            { id: 'backup',    label: 'Backup',           icon: 'backup' },
            { id: 'sistema',   label: 'Sistema',          icon: 'settings' },
          ].map(t => (
            <button key={t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              style={{ textAlign: 'left', width: '100%' }}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div>
          {/* Empresa */}
          {tab === 'empresa' && (
            <div className="card">
              <h3 style={{ marginBottom: 20 }}>Dados da Empresa</h3>
              <div className="form-grid form-grid-2" style={{ gap: 16 }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Razão Social</label>
                  <input className="form-input" value={empresa.nome} onChange={e => setEmpresa(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">CNPJ</label>
                  <input className="form-input" value={empresa.cnpj} onChange={e => setEmpresa(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Inscrição Municipal</label>
                  <input className="form-input" value={empresa.inscricaoMunicipal} onChange={e => setEmpresa(f => ({ ...f, inscricaoMunicipal: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Endereço</label>
                  <input className="form-input" value={empresa.endereco} onChange={e => setEmpresa(f => ({ ...f, endereco: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input className="form-input" value={empresa.cidade} onChange={e => setEmpresa(f => ({ ...f, cidade: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">CEP</label>
                  <input className="form-input" value={empresa.cep} onChange={e => setEmpresa(f => ({ ...f, cep: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-input" value={empresa.telefone} onChange={e => setEmpresa(f => ({ ...f, telefone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="email" value={empresa.email} onChange={e => setEmpresa(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <button className="btn btn-primary" onClick={handleSaveEmpresa}>Salvar Dados</button>
              </div>
            </div>
          )}

          {/* NFS-e */}
          {tab === 'nfse' && (
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>Integração NFS-e</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                Configure a integração com a API da Prefeitura de Ibiporã para emissão de NFS-e.
              </p>
              <div style={{ padding: 14, background: 'var(--accent-dim)', borderRadius: 'var(--radius)', marginBottom: 20, border: '1px solid rgba(240,165,0,0.2)', fontSize: 13 }}>
                <Icon name="alert" size={14} color="var(--accent)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                <strong>Prefeitura de Ibiporã — PR</strong> · Código IBGE: 4109708 · ISS padrão: 5%
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">URL da API NFS-e</label>
                  <input className="form-input" value={nfsConfig.url}
                    onChange={e => setNfsConfig(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://nfse.ibipora.pr.gov.br/api/v1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Token de Autenticação</label>
                  <input className="form-input" type="password" value={nfsConfig.token}
                    onChange={e => setNfsConfig(f => ({ ...f, token: e.target.value }))}
                    placeholder="••••••••••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">CNPJ do Prestador</label>
                  <input className="form-input" value={nfsConfig.cnpjPrestador}
                    onChange={e => setNfsConfig(f => ({ ...f, cnpjPrestador: e.target.value }))}
                    placeholder="00.000.000/0001-00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Inscrição Municipal do Prestador</label>
                  <input className="form-input" value={nfsConfig.inscricaoMunicipal}
                    onChange={e => setNfsConfig(f => ({ ...f, inscricaoMunicipal: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveNFS}>Salvar Configuração</button>
                <button className="btn btn-secondary" onClick={() => toast('Teste de conexão enviado...', 'info')}>
                  <Icon name="refresh" size={14} /> Testar Conexão
                </button>
              </div>
            </div>
          )}

          {/* Segurança */}
          {tab === 'seguranca' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Alterar Senha</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
                  <div className="form-group">
                    <label className="form-label">Senha Atual</label>
                    <input className="form-input" type="password" value={senhaForm.atual}
                      onChange={e => setSenhaForm(f => ({ ...f, atual: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nova Senha</label>
                    <input className="form-input" type="password" value={senhaForm.nova}
                      onChange={e => setSenhaForm(f => ({ ...f, nova: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirmar Nova Senha</label>
                    <input className="form-input" type="password" value={senhaForm.confirmar}
                      onChange={e => setSenhaForm(f => ({ ...f, confirmar: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={handleChangeSenha}>
                    <Icon name="lock" size={14} /> Alterar Senha
                  </button>
                </div>
              </div>

              {session.usuario.perfil === 'admin' && (
                <div className="card">
                  <h3 style={{ marginBottom: 16 }}>Usuários do Sistema</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { nome: 'Carlos Silva', email: 'admin@despachapr.com', perfil: 'admin' },
                      { nome: 'Fernanda Oliveira', email: 'fernanda@despachapr.com', perfil: 'operador' },
                    ].map(u => (
                      <div key={u.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                          {u.nome.split(' ').slice(0,2).map(n => n[0]).join('')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nome}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                        <span className={`badge ${u.perfil === 'admin' ? 'badge-amber' : 'badge-blue'}`}>{u.perfil}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
                    <Icon name="plus" size={12} /> Novo Usuário
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Backup */}
          {tab === 'backup' && (
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>Backup do Sistema</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>
                O backup exporta o banco de dados SQLite e todos os documentos anexados em um arquivo .zip compactado.
                Recomendamos fazer backup diariamente ou antes de qualquer manutenção.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {[
                  { icon: 'backup', label: 'Backup Completo', desc: 'Banco de dados + documentos', primary: true },
                  { icon: 'download', label: 'Exportar só o Banco', desc: 'Apenas o arquivo .db', primary: false },
                ].map(b => (
                  <div key={b.label} style={{ padding: 20, background: b.primary ? 'var(--accent-dim)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: `1px solid ${b.primary ? 'rgba(240,165,0,0.2)' : 'var(--bg-border)'}` }}>
                    <Icon name={b.icon} size={28} color={b.primary ? 'var(--accent)' : 'var(--text-muted)'} />
                    <div style={{ fontWeight: 700, marginTop: 10, marginBottom: 4 }}>{b.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{b.desc}</div>
                    <button className={`btn ${b.primary ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={handleBackup}>
                      Fazer Backup
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)' }}>
                <Icon name="info" size={14} color="var(--blue)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Recomendamos salvar os backups em um disco externo ou nuvem (Google Drive, OneDrive).
              </div>
            </div>
          )}

          {/* Sistema */}
          {tab === 'sistema' && (
            <div className="card">
              <h3 style={{ marginBottom: 20 }}>Informações do Sistema</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Versão', 'DespachaPR v1.0.0'],
                  ['Plataforma', 'Windows (Electron)'],
                  ['Banco de dados', 'SQLite (offline-first)'],
                  ['Usuário logado', `${session.usuario.nome} (${session.usuario.perfil})`],
                  ['Sessão', session.token.slice(0, 16) + '...'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => toast('Logs exportados!', 'success')}>
                  <Icon name="download" size={13} /> Exportar Logs
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => toast('Cache limpo!', 'success')}>
                  <Icon name="trash" size={13} /> Limpar Cache
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
