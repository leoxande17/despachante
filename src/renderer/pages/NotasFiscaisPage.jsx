// src/renderer/pages/NotasFiscaisPage.jsx
import React, { useState, useEffect } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
const STATUS_BADGE = { pendente: 'badge-amber', emitida: 'badge-green', cancelada: 'badge-red', erro: 'badge-red' };

export default function NotasFiscaisPage() {
  const toast = useToast();
  const [notas, setNotas]       = useState([]);
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]   = useState(true);

  const loadAll = () => {
    setLoading(true);
    Promise.all([api.nf.list({}), api.nf.getServicos(), api.crm.getClients({})]).then(([n, s, c]) => {
      if (n.success) setNotas(n.data);
      if (s.success) setServicos(s.data);
      if (c.success) setClientes(c.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const handleEmitir = async (data) => {
    const res = await api.nf.emitir(data);
    if (res.success) {
      toast(`Nota ${res.simulado ? '(simulada) ' : ''}emitida! Nº ${res.numero}`, 'success');
      setShowModal(false);
      loadAll();
    } else toast(res.error || 'Erro ao emitir', 'error');
  };

  const handleCancelar = async (id) => {
    if (!confirm('Cancelar esta nota fiscal? Esta ação não pode ser desfeita.')) return;
    const res = await api.nf.cancelar({ id, motivo: 'Cancelado pelo operador' });
    if (res.success) { toast('Nota cancelada', 'info'); loadAll(); }
    else toast(res.error || 'Erro ao cancelar', 'error');
  };

  const totalEmitidas = notas.filter(n => n.status === 'emitida').reduce((s, n) => s + (n.valor_servico || 0), 0);
  const qtdEmitidas = notas.filter(n => n.status === 'emitida').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notas Fiscais</h1>
          <p className="page-subtitle">NFS-e — Prefeitura de Ibiporã</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Icon name="plus" size={15} /> Emitir Nota
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Emitidas (total)</div>
          <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{fmt(totalEmitidas)}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Quantidade emitidas</div>
          <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800 }}>{qtdEmitidas}</div>
        </div>
        <div className="card" style={{ padding: 16, background: 'var(--accent-dim)', border: '1px solid rgba(240,165,0,0.2)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Integração NFS-e</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Modo demonstração</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Configure a API em Configurações</div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Número</th><th>Cliente</th><th>Serviço</th>
                <th>Valor</th><th>ISS</th><th>Status</th><th>Emitida em</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</td></tr>}
              {!loading && notas.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                  Nenhuma nota fiscal emitida
                </td></tr>
              )}
              {notas.map(n => (
                <tr key={n.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {n.numero || '—'}
                  </td>
                  <td>{n.cliente_nome || '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.descricao_servico}
                  </td>
                  <td style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--green)' }}>{fmt(n.valor_servico)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(n.valor_iss)} ({n.aliquota_iss}%)</td>
                  <td><span className={`badge ${STATUS_BADGE[n.status] || 'badge-gray'}`}>{n.status}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtDate(n.emitida_em)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {n.pdf_path && (
                        <button className="btn btn-secondary btn-sm" onClick={() => api.nf.openPDF(n.id)}>
                          <Icon name="eye" size={12} /> PDF
                        </button>
                      )}
                      {n.status === 'emitida' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancelar(n.id)}>
                          <Icon name="x" size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <EmitirModal
          servicos={servicos}
          clientes={clientes}
          onEmitir={handleEmitir}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function EmitirModal({ servicos, clientes, onEmitir, onClose }) {
  const [form, setForm] = useState({
    cliente_id: '', servico_id: '', descricao_servico: '',
    valor_servico: '', aliquota_iss: 5, codigo_servico: '7319',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleServicoChange = (id) => {
    const s = servicos.find(s => s.id === id);
    set('servico_id', id);
    if (s) {
      set('descricao_servico', s.nome);
      set('valor_servico', s.valor_padrao || '');
      set('codigo_servico', s.codigo_servico_nf || '7319');
    }
  };

  const valorNum = parseFloat(String(form.valor_servico).replace(',', '.')) || 0;
  const valorISS = (valorNum * form.aliquota_iss / 100).toFixed(2);
  const valorLiq = (valorNum - parseFloat(valorISS)).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.cliente_id) return;
    onEmitir({ ...form, valor_servico: valorNum });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Emitir Nota Fiscal de Serviço</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Cliente / Tomador *</label>
              <select className="form-select" required value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
                <option value="">— Selecione o cliente —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.cpf_cnpj || 'sem CPF/CNPJ'})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Serviço</label>
              <select className="form-select" value={form.servico_id} onChange={e => handleServicoChange(e.target.value)}>
                <option value="">— Selecione o serviço —</option>
                {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Descrição do Serviço *</label>
              <textarea className="form-textarea" required value={form.descricao_servico}
                onChange={e => set('descricao_servico', e.target.value)} placeholder="Descreva o serviço prestado..." />
            </div>

            <div className="form-grid form-grid-3" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Valor do Serviço (R$) *</label>
                <input className="form-input" required type="number" step="0.01" min="0.01"
                  value={form.valor_servico} onChange={e => set('valor_servico', e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Alíquota ISS (%)</label>
                <input className="form-input" type="number" step="0.01" min="0" max="100"
                  value={form.aliquota_iss} onChange={e => set('aliquota_iss', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Cód. Tributação Municipal</label>
                <input className="form-input" value={form.codigo_servico} onChange={e => set('codigo_servico', e.target.value)} />
              </div>
            </div>

            {/* Preview de valores */}
            {valorNum > 0 && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius)', padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12 }}>RESUMO DA NOTA</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  {[
                    ['Valor bruto do serviço', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNum), 'var(--text-primary)'],
                    [`ISS (${form.aliquota_iss}%)`, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(valorISS)), 'var(--red)'],
                    ['Valor líquido', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(valorLiq)), 'var(--green)'],
                  ].map(([k, v, color]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span style={{ fontFamily: 'Syne', fontWeight: 700, color }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '10px 14px', background: 'var(--accent-dim)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-secondary)', border: '1px solid rgba(240,165,0,0.15)' }}>
              <Icon name="info" size={14} color="var(--accent)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
              A nota será enviada à API NFS-e da Prefeitura de Ibiporã. Configure a URL e token em Configurações.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!form.cliente_id || !form.descricao_servico || !valorNum}>
              <Icon name="receipt" size={14} /> Emitir Nota Fiscal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
