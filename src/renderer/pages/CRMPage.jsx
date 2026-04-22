// src/renderer/pages/CRMPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const ETAPAS = [
  { id: 'novo',           label: 'Novos',         color: '#6b7280' },
  { id: 'em_atendimento', label: 'Em Atendimento', color: '#3b82f6' },
  { id: 'proposta',       label: 'Proposta',       color: '#a855f7' },
  { id: 'negociacao',     label: 'Negociação',     color: '#f0a500' },
  { id: 'fechado',        label: 'Fechado',        color: '#22c55e' },
  { id: 'perdido',        label: 'Perdido',        color: '#ef4444' },
];

const ORIGENS = ['whatsapp', 'indicacao', 'instagram', 'google', 'manual', 'outro'];
const fmt = (v) => v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '';

export default function CRMPage() {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const loadLeads = () => {
    setLoading(true);
    api.crm.getLeads().then(res => {
      if (res.success) setLeads(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadLeads(); }, []);

  const getLeadsByEtapa = (etapa) =>
    leads.filter(l => l.etapa === etapa)
         .sort((a, b) => a.posicao_kanban - b.posicao_kanban);

  // Drag & Drop
  const handleDragStart = (e, lead) => {
    setDragging(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, etapa) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(etapa);
  };

  const handleDrop = async (e, etapa) => {
    e.preventDefault();
    if (!dragging || dragging.etapa === etapa) {
      setDragging(null); setDragOver(null); return;
    }

    const newPos = getLeadsByEtapa(etapa).length + 1;
    await api.crm.moveLead({ id: dragging.id, etapa, posicao: newPos });
    setDragging(null); setDragOver(null);
    loadLeads();
    toast(`Lead movido para "${ETAPAS.find(e => e.id === etapa)?.label}"`, 'success');
  };

  const handleSaveLead = async (data) => {
    let res;
    if (editingLead?.id) {
      res = await api.crm.updateLead({ ...editingLead, ...data });
    } else {
      res = await api.crm.createLead(data);
    }
    if (res.success) {
      toast(editingLead ? 'Lead atualizado!' : 'Lead criado!', 'success');
      setShowModal(false); setEditingLead(null);
      loadLeads();
    } else {
      toast(res.error || 'Erro ao salvar', 'error');
    }
  };

  const handleConvert = async (leadId) => {
    const res = await api.crm.convertToClient(leadId);
    if (res.success) {
      toast('Lead convertido em cliente!', 'success');
      setDetailLead(null);
      loadLeads();
    } else {
      toast(res.error || 'Erro ao converter', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este lead?')) return;
    await api.crm.deleteLead(id);
    toast('Lead removido', 'info');
    loadLeads();
  };

  const totalValor = leads.filter(l => !['perdido'].includes(l.etapa))
    .reduce((s, l) => s + (l.valor_estimado || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Funil de Vendas</h1>
          <p className="page-subtitle">
            {leads.length} leads · Pipeline de {fmt(totalValor)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadLeads}>
            <Icon name="refresh" size={14} /> Atualizar
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingLead(null); setShowModal(true); }}>
            <Icon name="plus" size={15} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : (
        <div className="kanban-board">
          {ETAPAS.map(etapa => {
            const col = getLeadsByEtapa(etapa.id);
            const colTotal = col.reduce((s, l) => s + (l.valor_estimado || 0), 0);
            return (
              <div
                key={etapa.id}
                className={`kanban-col etapa-${etapa.id}`}
                style={{ '--col': etapa.color }}
                onDragOver={e => handleDragOver(e, etapa.id)}
                onDrop={e => handleDrop(e, etapa.id)}
              >
                <div className="kanban-col-header">
                  <span className="kanban-col-title">{etapa.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {colTotal > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(colTotal)}</span>
                    )}
                    <span className="kanban-count">{col.length}</span>
                  </div>
                </div>

                <div className="kanban-cards" style={{
                  background: dragOver === etapa.id ? 'rgba(240,165,0,0.04)' : '',
                  transition: 'background 0.15s'
                }}>
                  {col.map(lead => (
                    <div
                      key={lead.id}
                      className={`kanban-card ${dragging?.id === lead.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={e => handleDragStart(e, lead)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={() => setDetailLead(lead)}
                    >
                      <div className="kanban-card-name">{lead.nome}</div>
                      <div className="kanban-card-meta">
                        {lead.telefone && <span>{lead.telefone}</span>}
                        {lead.servico_interesse && (
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>
                            {lead.servico_interesse}
                          </span>
                        )}
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>
                          {lead.origem}
                        </span>
                      </div>
                      {lead.valor_estimado > 0 && (
                        <div className="kanban-card-value">{fmt(lead.valor_estimado)}</div>
                      )}
                    </div>
                  ))}

                  {col.length === 0 && (
                    <div style={{
                      textAlign: 'center', padding: '20px 8px', color: 'var(--text-muted)', fontSize: 12,
                      border: '2px dashed var(--bg-border)', borderRadius: 'var(--radius)',
                    }}>
                      Arraste cards aqui
                    </div>
                  )}

                  {/* Add lead in this stage */}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 12 }}
                    onClick={() => { setEditingLead({ etapa: etapa.id }); setShowModal(true); }}
                  >
                    <Icon name="plus" size={12} /> Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <LeadModal
          initial={editingLead}
          onSave={handleSaveLead}
          onClose={() => { setShowModal(false); setEditingLead(null); }}
        />
      )}

      {/* Detail modal */}
      {detailLead && (
        <LeadDetail
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onEdit={(l) => { setDetailLead(null); setEditingLead(l); setShowModal(true); }}
          onConvert={handleConvert}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function LeadModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    nome: '', telefone: '', whatsapp: '', email: '',
    origem: 'manual', etapa: 'novo', servico_interesse: '',
    veiculo_placa: '', valor_estimado: '', motivo_perda: '',
    ...initial
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, valor_estimado: form.valor_estimado ? parseFloat(String(form.valor_estimado).replace(',', '.')) : null });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial?.id ? 'Editar Lead' : 'Novo Lead'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2" style={{ gap: 16 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nome *</label>
              <input className="form-input" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(43) 99999-9999" />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(43) 99999-9999" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Origem</label>
              <select className="form-select" value={form.origem} onChange={e => set('origem', e.target.value)}>
                {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Etapa</label>
              <select className="form-select" value={form.etapa} onChange={e => set('etapa', e.target.value)}>
                {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Serviço de Interesse</label>
              <input className="form-input" value={form.servico_interesse} onChange={e => set('servico_interesse', e.target.value)} placeholder="Ex: Transferência" />
            </div>
            <div className="form-group">
              <label className="form-label">Placa do Veículo</label>
              <input className="form-input" value={form.veiculo_placa} onChange={e => set('veiculo_placa', e.target.value.toUpperCase())} placeholder="AAA-0000" maxLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Valor Estimado (R$)</label>
              <input className="form-input" type="number" step="0.01" value={form.valor_estimado} onChange={e => set('valor_estimado', e.target.value)} placeholder="0,00" />
            </div>
            {form.etapa === 'perdido' && (
              <div className="form-group">
                <label className="form-label">Motivo da Perda</label>
                <input className="form-input" value={form.motivo_perda} onChange={e => set('motivo_perda', e.target.value)} />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              {initial?.id ? 'Salvar Alterações' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadDetail({ lead, onClose, onEdit, onConvert, onDelete }) {
  const [history, setHistory] = useState([]);
  const [interacao, setInteracao] = useState('');

  useEffect(() => {
    api.crm.getLeadHistory(lead.id).then(res => {
      if (res.success) setHistory(res.data);
    });
  }, [lead.id]);

  const handleAddInteracao = async () => {
    if (!interacao.trim()) return;
    await api.crm.addInteraction({ lead_id: lead.id, tipo: 'nota', descricao: interacao });
    setInteracao('');
    api.crm.getLeadHistory(lead.id).then(res => { if (res.success) setHistory(res.data); });
  };

  const etapaInfo = ETAPAS.find(e => e.id === lead.etapa);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{lead.nome}</h3>
            <span className="badge" style={{ background: `${etapaInfo?.color}22`, color: etapaInfo?.color, marginTop: 6 }}>
              {etapaInfo?.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!lead.cliente_id && lead.etapa !== 'perdido' && (
              <button className="btn btn-secondary btn-sm" onClick={() => onConvert(lead.id)}>
                <Icon name="check" size={13} /> Converter em Cliente
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(lead)}>
              <Icon name="edit" size={13} /> Editar
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => { onDelete(lead.id); onClose(); }}>
              <Icon name="trash" size={13} />
            </button>
            <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Info */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12 }}>INFORMAÇÕES</div>
            {[
              ['Telefone', lead.telefone], ['WhatsApp', lead.whatsapp], ['E-mail', lead.email],
              ['Origem', lead.origem], ['Serviço', lead.servico_interesse],
              ['Placa', lead.veiculo_placa], ['Valor est.', lead.valor_estimado ? fmt(lead.valor_estimado) : null],
            ].filter(([,v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Histórico */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12 }}>HISTÓRICO</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {history.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sem interações</div>}
              {history.map(h => (
                <div key={h.id} style={{
                  padding: '8px 12px', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius)', fontSize: 12
                }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>{h.descricao}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {h.usuario_nome} · {new Date(h.criado_em).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input" placeholder="Adicionar nota..."
                value={interacao} onChange={e => setInteracao(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddInteracao()}
                style={{ fontSize: 13 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddInteracao}>
                <Icon name="send" size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
