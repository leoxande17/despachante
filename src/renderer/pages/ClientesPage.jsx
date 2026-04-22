// src/renderer/pages/ClientesPage.jsx
import React, { useState, useEffect } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const fmt = (v) => v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '';

function maskCPF(v) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0,14);
}
function maskCNPJ(v) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2').slice(0,18);
}
function maskPhone(v) {
  const d = v.replace(/\D/g, '');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0,15);
}

export default function ClientesPage() {
  const toast = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [detailCliente, setDetailCliente] = useState(null);

  const loadClientes = (q = '') => {
    setLoading(true);
    api.crm.getClients({ search: q }).then(res => {
      if (res.success) setClientes(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadClientes(); }, []);

  const handleSearch = (q) => {
    setSearch(q);
    const timer = setTimeout(() => loadClientes(q), 300);
    return () => clearTimeout(timer);
  };

  const handleSave = async (data) => {
    const res = await api.crm.updateClient(data);
    if (res.success) {
      toast('Cliente salvo!', 'success');
      setShowModal(false); setEditingCliente(null);
      loadClientes(search);
    } else toast(res.error || 'Erro ao salvar', 'error');
  };

  const openDetail = (c) => {
    api.crm.getClient(c.id).then(res => {
      if (res.success) setDetailCliente(res.data);
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes cadastrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-wrapper" style={{ minWidth: 260 }}>
            <Icon name="search" size={14} className="search-icon" />
            <input className="search-box" placeholder="Buscar por nome, CPF/CNPJ..." value={search} onChange={e => handleSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingCliente({}); setShowModal(true); }}>
            <Icon name="plus" size={15} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Grid de clientes */}
      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : clientes.length === 0 ? (
        <div className="empty-state">
          <Icon name="users" size={48} />
          <h3>Nenhum cliente encontrado</h3>
          <p>Adicione um novo cliente ou converta um lead.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {clientes.map(c => (
            <div key={c.id} className="card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}
              onClick={() => openDetail(c)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  background: c.tipo === 'PJ' ? 'var(--blue-dim)' : 'var(--accent-dim)',
                  color: c.tipo === 'PJ' ? 'var(--blue)' : 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne', fontWeight: 700, fontSize: 15
                }}>
                  {c.nome.split(' ').slice(0,2).map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.cpf_cnpj}</div>
                </div>
                <span className={`badge ${c.tipo === 'PJ' ? 'badge-blue' : 'badge-gray'}`}>{c.tipo}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                {c.telefone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                    <Icon name="phone" size={13} /> {c.telefone}
                  </div>
                )}
                {c.cidade && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                    <Icon name="store" size={13} /> {c.cidade}/{c.estado}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                  onClick={e => { e.stopPropagation(); setEditingCliente(c); setShowModal(true); }}>
                  <Icon name="edit" size={12} /> Editar
                </button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                  onClick={e => { e.stopPropagation(); openDetail(c); }}>
                  <Icon name="eye" size={12} /> Detalhe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ClienteModal
          initial={editingCliente}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingCliente(null); }}
        />
      )}

      {detailCliente && (
        <ClienteDetail
          cliente={detailCliente}
          onClose={() => setDetailCliente(null)}
          onEdit={() => { setEditingCliente(detailCliente); setShowModal(true); setDetailCliente(null); }}
        />
      )}
    </div>
  );
}

function ClienteModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    tipo: 'PF', nome: '', cpf_cnpj: '', rg: '', email: '',
    telefone: '', whatsapp: '', cep: '', logradouro: '',
    numero: '', complemento: '', bairro: '', cidade: 'Ibiporã',
    estado: 'PR', observacoes: '', ...initial
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCPFCNPJ = (v) => {
    if (form.tipo === 'PF') set('cpf_cnpj', maskCPF(v));
    else set('cpf_cnpj', maskCNPJ(v));
  };

  const handleCEP = async (cep) => {
    set('cep', cep);
    const clean = cep.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const d = await r.json();
        if (!d.erro) {
          set('logradouro', d.logradouro);
          set('bairro', d.bairro);
          set('cidade', d.localidade);
          set('estado', d.uf);
        }
      } catch {}
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial?.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          {/* Tipo */}
          <div style={{ marginBottom: 20 }}>
            <div className="tabs">
              {['PF', 'PJ'].map(t => (
                <button key={t} type="button" className={`tab-btn ${form.tipo === t ? 'active' : ''}`}
                  onClick={() => set('tipo', t)}>
                  {t === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">{form.tipo === 'PF' ? 'Nome Completo' : 'Razão Social'} *</label>
              <input className="form-input" required value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{form.tipo === 'PF' ? 'CPF' : 'CNPJ'}</label>
              <input className="form-input" value={form.cpf_cnpj} onChange={e => handleCPFCNPJ(e.target.value)}
                placeholder={form.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'} />
            </div>
            {form.tipo === 'PF' && (
              <div className="form-group">
                <label className="form-label">RG</label>
                <input className="form-input" value={form.rg} onChange={e => set('rg', e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.telefone}
                onChange={e => set('telefone', maskPhone(e.target.value))} placeholder="(43) 99999-9999" />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" value={form.whatsapp}
                onChange={e => set('whatsapp', maskPhone(e.target.value))} placeholder="(43) 99999-9999" />
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12 }}>ENDEREÇO</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">CEP</label>
              <input className="form-input" value={form.cep} onChange={e => handleCEP(e.target.value)} placeholder="00000-000" maxLength={9} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Logradouro</label>
              <input className="form-input" value={form.logradouro} onChange={e => set('logradouro', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Número</label>
              <input className="form-input" value={form.numero} onChange={e => set('numero', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Complemento</label>
              <input className="form-input" value={form.complemento} onChange={e => set('complemento', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bairro</label>
              <input className="form-input" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input className="form-input" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <input className="form-input" value={form.estado} onChange={e => set('estado', e.target.value)} maxLength={2} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
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

function ClienteDetail({ cliente, onClose, onEdit }) {
  const [processos, setProcessos] = useState(cliente.processos || []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{cliente.nome}</h3>
            <span className="badge badge-blue" style={{ marginTop: 4 }}>{cliente.tipo}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onEdit}><Icon name="edit" size={13} /> Editar</button>
            <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12 }}>DADOS PESSOAIS</div>
            {[
              ['CPF/CNPJ', cliente.cpf_cnpj], ['RG', cliente.rg], ['E-mail', cliente.email],
              ['Telefone', cliente.telefone], ['WhatsApp', cliente.whatsapp],
            ].filter(([,v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12 }}>ENDEREÇO</div>
            {[
              ['CEP', cliente.cep],
              ['Logradouro', [cliente.logradouro, cliente.numero, cliente.complemento].filter(Boolean).join(', ')],
              ['Bairro', cliente.bairro],
              ['Cidade/UF', cliente.cidade && `${cliente.cidade}/${cliente.estado}`],
            ].filter(([,v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12 }}>PROCESSOS</div>
          {processos.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16, textAlign: 'center' }}>Nenhum processo</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Número</th><th>Serviço</th><th>Placa</th><th>Status</th><th>Valor</th></tr>
                </thead>
                <tbody>
                  {processos.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{p.numero}</td>
                      <td>{p.servico_nome || p.descricao || '-'}</td>
                      <td>{p.veiculo_placa || '-'}</td>
                      <td><span className={`badge ${p.status === 'concluido' ? 'badge-green' : p.status === 'aberto' ? 'badge-amber' : 'badge-gray'}`}>{p.status}</span></td>
                      <td style={{ fontFamily: 'Syne', fontWeight: 700 }}>{fmt(p.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
