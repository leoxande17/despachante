// src/renderer/pages/FinanceiroPage.jsx
import React, { useState, useEffect } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

const STATUS_BADGE = {
  pendente: 'badge-amber', pago: 'badge-green',
  atrasado: 'badge-red', cancelado: 'badge-gray'
};

const CATEGORIAS_RECEITA = ['Serviços de Despachante', 'Taxas Repassadas', 'Outros'];
const CATEGORIAS_DESPESA = ['Aluguel', 'Utilities', 'Material', 'Software', 'Pessoal', 'Impostos', 'Outros'];
const FORMAS = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'boleto', 'transferencia'];

export default function FinanceiroPage() {
  const toast = useToast();
  const [tab, setTab] = useState('receber');
  const [lancamentos, setLancamentos] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLanc, setEditingLanc] = useState(null);
  const [showPagModal, setShowPagModal] = useState(null); // lancamento a pagar

  const loadData = () => {
    setLoading(true);
    const fetchFn = tab === 'receber' ? api.financeiro.getContasReceber : api.financeiro.getContasPagar;
    Promise.all([fetchFn(), api.financeiro.getDashboard()]).then(([res, dash]) => {
      if (res.success) setLancamentos(res.data);
      if (dash.success) setDashboard(dash.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, [tab]);

  const handleSave = async (data) => {
    let res;
    if (editingLanc?.id) {
      res = await api.financeiro.updateLancamento({ ...editingLanc, ...data });
    } else {
      res = await api.financeiro.createLancamento({ ...data, tipo: tab === 'receber' ? 'receita' : 'despesa' });
    }
    if (res.success) {
      toast('Lançamento salvo!', 'success');
      setShowModal(false); setEditingLanc(null);
      loadData();
    }
  };

  const handlePagar = async (data) => {
    const res = await api.financeiro.registrarPagamento({ id: showPagModal.id, ...data });
    if (res.success) {
      toast('Pagamento registrado!', 'success');
      setShowPagModal(null);
      loadData();
    }
  };

  const inadimplentes = lancamentos.filter(l => l.status === 'atrasado').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Contas a pagar e receber</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingLanc(null); setShowModal(true); }}>
          <Icon name="plus" size={15} /> Novo Lançamento
        </button>
      </div>

      {/* Dashboard cards */}
      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Receita do Mês', value: fmt(dashboard.receitaMes), color: 'var(--green)', bg: 'var(--green-dim)' },
            { label: 'A Receber', value: fmt(dashboard.totalReceber), color: 'var(--accent)', bg: 'var(--accent-dim)' },
            { label: 'A Pagar', value: fmt(dashboard.totalPagar), color: 'var(--red)', bg: 'var(--red-dim)' },
            { label: 'Saldo do Mês', value: fmt(dashboard.saldoMes), color: 'var(--blue)', bg: 'var(--blue-dim)' },
          ].map(c => (
            <div key={c.label} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div className="tabs">
          {[
            { id: 'receber', label: 'A Receber' },
            { id: 'pagar', label: 'A Pagar' },
            { id: 'inadimplentes', label: `Inadimplentes ${inadimplentes > 0 ? `(${inadimplentes})` : ''}` },
          ].map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</td></tr>
              )}
              {!loading && lancamentos.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum lançamento</td></tr>
              )}
              {lancamentos.map(l => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.descricao}</td>
                  <td>{l.cliente_nome || '-'}</td>
                  <td>{l.categoria}</td>
                  <td style={{ color: l.status === 'atrasado' ? 'var(--red)' : '' }}>{fmtDate(l.data_vencimento)}</td>
                  <td style={{ fontFamily: 'Syne', fontWeight: 700, color: l.tipo === 'receita' ? 'var(--green)' : 'var(--red)' }}>
                    {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[l.status] || 'badge-gray'}`}>{l.status}</span></td>
                  <td style={{ fontSize: 12 }}>
                    {l.data_pagamento ? `${fmtDate(l.data_pagamento)} · ${l.forma_pagamento}` : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {l.status === 'pendente' || l.status === 'atrasado' ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowPagModal(l)}>
                          <Icon name="check" size={12} /> Registrar
                        </button>
                      ) : null}
                      <button className="btn btn-icon btn-ghost" onClick={() => { setEditingLanc(l); setShowModal(true); }}>
                        <Icon name="edit" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <LancamentoModal
          initial={editingLanc}
          tipo={tab === 'receber' ? 'receita' : 'despesa'}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingLanc(null); }}
        />
      )}

      {showPagModal && (
        <PagamentoModal
          lancamento={showPagModal}
          onSave={handlePagar}
          onClose={() => setShowPagModal(null)}
        />
      )}
    </div>
  );
}

function LancamentoModal({ initial, tipo, onSave, onClose }) {
  const [form, setForm] = useState({
    categoria: tipo === 'receita' ? 'Serviços de Despachante' : 'Aluguel',
    descricao: '', valor: '', data_vencimento: new Date().toISOString().slice(0,10),
    forma_pagamento: '', observacoes: '', ...initial
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cats = tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial?.id ? 'Editar Lançamento' : `Novo ${tipo === 'receita' ? 'Recebimento' : 'Pagamento'}`}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, valor: parseFloat(String(form.valor).replace(',', '.')) }); }}>
          <div className="form-grid" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição *</label>
              <input className="form-input" required value={form.descricao} onChange={e => set('descricao', e.target.value)} />
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input className="form-input" required type="number" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Vencimento *</label>
                <input className="form-input" required type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
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
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Registrar Pagamento</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lancamento.descricao}</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20, color: 'var(--accent)', marginTop: 4 }}>
            {fmt(lancamento.valor)}
          </div>
        </div>
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Forma de Pagamento</label>
            <select className="form-select" value={forma} onChange={e => setForma(e.target.value)}>
              {FORMAS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data do Pagamento</label>
            <input className="form-input" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ forma_pagamento: forma, data_pagamento: data })}>
            <Icon name="check" size={14} /> Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}
