// src/renderer/pages/CaixaPage.jsx
import React, { useState, useEffect } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

export default function CaixaPage() {
  const toast = useToast();
  const [caixa, setCaixa] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(null); // 'entrada' | 'saida'

  const loadData = async () => {
    setLoading(true);
    const [cxRes] = await Promise.all([api.caixa.getAtual()]);
    if (cxRes.success && cxRes.data) {
      setCaixa(cxRes.data);
      const movRes = await api.caixa.getMovimentos(cxRes.data.id);
      if (movRes.success) setMovimentos(movRes.data);
    } else {
      setCaixa(null);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const totalEntradas = movimentos.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0);
  const totalSaidas = movimentos.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0);
  const saldoAtual = (caixa?.valor_inicial || 0) + totalEntradas - totalSaidas;

  const handleAbrir = async ({ valorInicial }) => {
    const res = await api.caixa.abrir({ valor_inicial: parseFloat(valorInicial) });
    if (res.success) { toast('Caixa aberto!', 'success'); setShowAbrirModal(false); loadData(); }
  };

  const handleFechar = async ({ observacoes }) => {
    const res = await api.caixa.fechar({ id: caixa.id, valor_final: saldoAtual, observacoes });
    if (res.success) { toast('Caixa fechado!', 'success'); setShowFecharModal(false); loadData(); }
  };

  const handleMovimento = async ({ tipo, descricao, valor, forma }) => {
    const res = await api.caixa.addMovimento({
      caixa_id: caixa.id, tipo, descricao, valor: parseFloat(valor), forma_pagamento: forma
    });
    if (res.success) { toast('Movimento registrado!', 'success'); setShowMovModal(null); loadData(); }
  };

  if (loading) return <div className="empty-state">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de Caixa</h1>
          <p className="page-subtitle">{caixa ? `Caixa aberto desde ${fmtTime(caixa.data_abertura)}` : 'Nenhum caixa aberto hoje'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!caixa ? (
            <button className="btn btn-primary" onClick={() => setShowAbrirModal(true)}>
              <Icon name="cash" size={15} /> Abrir Caixa
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setShowMovModal('saida')}>
                <Icon name="arrowDown" size={14} /> Saída
              </button>
              <button className="btn btn-secondary" onClick={() => setShowMovModal('entrada')}>
                <Icon name="arrowUp" size={14} /> Entrada
              </button>
              <button className="btn btn-danger" onClick={() => setShowFecharModal(true)}>
                Fechar Caixa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status cards */}
      {caixa ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Saldo Inicial', value: fmt(caixa.valor_inicial), color: 'var(--text-primary)', bg: 'var(--bg-elevated)' },
              { label: 'Total Entradas', value: fmt(totalEntradas), color: 'var(--green)', bg: 'var(--green-dim)' },
              { label: 'Total Saídas', value: fmt(totalSaidas), color: 'var(--red)', bg: 'var(--red-dim)' },
              { label: 'Saldo Atual', value: fmt(saldoAtual), color: 'var(--accent)', bg: 'var(--accent-dim)', big: true },
            ].map(c => (
              <div key={c.label} className="card" style={{ background: c.bg, border: `1px solid ${c.bg}` }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: c.big ? 28 : 22, color: c.color }}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          {/* Movimentos */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>Movimentos do Dia</h3>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{movimentos.length} registros</span>
            </div>
            {movimentos.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <Icon name="cash" size={32} />
                <p>Nenhum movimento registrado</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Horário</th><th>Tipo</th><th>Descrição</th><th>Forma</th><th>Valor</th></tr>
                </thead>
                <tbody>
                  {movimentos.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(m.criado_em)}</td>
                      <td>
                        <span className={`badge ${m.tipo === 'entrada' ? 'badge-green' : 'badge-red'}`}>
                          {m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.descricao}</td>
                      <td style={{ fontSize: 12 }}>{m.forma_pagamento || '-'}</td>
                      <td style={{ fontFamily: 'Syne', fontWeight: 700, color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--red)' }}>
                        {m.tipo === 'entrada' ? '+' : '-'}{fmt(m.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state" style={{ height: 300 }}>
          <Icon name="cash" size={56} />
          <h3>Caixa não aberto</h3>
          <p>Abra o caixa para registrar movimentos do dia</p>
          <button className="btn btn-primary" onClick={() => setShowAbrirModal(true)}>
            Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* Modals */}
      {showAbrirModal && <AbrirModal onSave={handleAbrir} onClose={() => setShowAbrirModal(false)} />}
      {showFecharModal && <FecharModal saldo={saldoAtual} onSave={handleFechar} onClose={() => setShowFecharModal(false)} />}
      {showMovModal && <MovimentoModal tipo={showMovModal} onSave={handleMovimento} onClose={() => setShowMovModal(null)} />}
    </div>
  );
}

function AbrirModal({ onSave, onClose }) {
  const [valor, setValor] = useState('0');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Abrir Caixa</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label className="form-label">Troco / Saldo Inicial (R$)</label>
          <input className="form-input" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} autoFocus />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ valorInicial: valor })}>
            <Icon name="check" size={14} /> Abrir Caixa
          </button>
        </div>
      </div>
    </div>
  );
}

function FecharModal({ saldo, onSave, onClose }) {
  const [obs, setObs] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Fechar Caixa</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: '14px', background: 'var(--accent-dim)', borderRadius: 'var(--radius)', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saldo a fechar</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: 'var(--accent)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldo)}
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label className="form-label">Observações</label>
          <textarea className="form-textarea" value={obs} onChange={e => setObs(e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={() => onSave({ observacoes: obs })}>Fechar Caixa</button>
        </div>
      </div>
    </div>
  );
}

function MovimentoModal({ tipo, onSave, onClose }) {
  const [form, setForm] = useState({ descricao: '', valor: '', forma: 'dinheiro' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ color: tipo === 'entrada' ? 'var(--green)' : 'var(--red)' }}>
            {tipo === 'entrada' ? '↑ Registrar Entrada' : '↓ Registrar Saída'}
          </h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Descrição *</label>
            <input className="form-input" required value={form.descricao} onChange={e => set('descricao', e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Valor (R$) *</label>
            <input className="form-input" required type="number" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Forma de Pagamento</label>
            <select className="form-select" value={form.forma} onChange={e => set('forma', e.target.value)}>
              {['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => form.descricao && form.valor && onSave({ ...form, tipo })}>
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}
