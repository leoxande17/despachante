// src/renderer/pages/WhatsAppPage.jsx
import React, { useState, useEffect } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

export default function WhatsAppPage() {
  const toast = useToast();
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [sendForm, setSendForm] = useState({ numero: '', mensagem: '' });
  const [flows, setFlows] = useState([]);

  useEffect(() => {
    api.whatsapp.getStatus().then(r => { if (r.success) setStatus(r.status); });
    api.whatsapp.getTemplates().then(r => { if (r.success) setTemplates(r.data); });
    api.whatsapp.getFlows().then(r => { if (r.success) setFlows(r.data); });
    api.whatsapp.onQR((qr) => setQrCode(qr));
    api.whatsapp.onReady(() => { setStatus('connected'); setQrCode(null); });
  }, []);

  const handleConnect = async () => {
    setStatus('connecting');
    const r = await api.whatsapp.init();
    if(!r.success){
      setStatus('disconnected');
      toast(r.error || 'Erro ao conectar WhatsApp', 'error');
    }
  };

  const handleDisconnect = async () => {
    await api.whatsapp.disconnect();
    setStatus('disconnected');
  };

  const handleSend = async () => {
    if (!sendForm.numero || !sendForm.mensagem) return;
    const res = await api.whatsapp.sendMessage(sendForm);
    if (res.success) { toast('Mensagem enviada!', 'success'); setSendForm({ numero: '', mensagem: '' }); }
    else toast('Erro ao enviar', 'error');
  };

  const handleSaveTemplate = async data => {
    const r = await api.whatsapp.createTemplate(data);
    if(r.success){
      toast('Resposta rápida criada!','success');
      setShowTemplateModal(false);
      const list = await api.whatsapp.getTemplates();
      if(list.success) setTemplates(list.data);
    } else toast(r.error||'Erro ao criar resposta','error');
  };

  const toggleFlow = async id => {
    const next = flows.map(f=>f.id===id ? {...f, ativo:!f.ativo} : f);
    setFlows(next);
    const r = await api.whatsapp.saveFlows(next);
    if(r.success) toast('Fluxo atualizado','success');
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">WhatsApp</h1><p className="page-subtitle">Automação de atendimento</p></div>
        {status !== 'connected' ? (
          <button className="btn btn-primary" onClick={handleConnect} disabled={status === 'connecting'}>
            {status === 'connecting' ? 'Conectando...' : '⟳ Conectar WhatsApp'}
          </button>
        ) : (
          <button className="btn btn-danger" onClick={handleDisconnect}>Desconectar</button>
        )}
      </div>

      {/* Status */}
      <div className={`card`} style={{
        marginBottom: 20, padding: '14px 20px', display: 'flex', gap: 14, alignItems: 'center',
        background: status === 'connected' ? 'var(--green-dim)' : status === 'connecting' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
        border: `1px solid ${status === 'connected' ? 'rgba(34,197,94,0.2)' : status === 'connecting' ? 'rgba(240,165,0,0.2)' : 'var(--bg-border)'}`
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
          background: status === 'connected' ? 'var(--green)' : status === 'connecting' ? 'var(--accent)' : 'var(--text-muted)',
          boxShadow: status === 'connected' ? '0 0 8px var(--green)' : status === 'connecting' ? '0 0 8px var(--accent)' : ''
        }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {status === 'connected' ? 'WhatsApp conectado e pronto para uso' :
           status === 'connecting' ? 'Aguardando QR Code...' : 'WhatsApp desconectado'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* QR Code / envio */}
        <div className="card">
          {status === 'connecting' && qrCode ? (
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ marginBottom: 16 }}>Escaneie o QR Code</h3>
              <div style={{ padding: 16, background: 'white', borderRadius: 8, display: 'inline-block', marginBottom: 12 }}>
                <img src={qrCode} alt="QR Code" style={{ width: 220, height: 220 }} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Abra o WhatsApp → Dispositivos vinculados → Vincular</p>
            </div>
          ) : status === 'connected' ? (
            <div>
              <h3 style={{ marginBottom: 16 }}>Enviar Mensagem</h3>
              <div className="form-grid" style={{ gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Número (com DDD)</label>
                  <input className="form-input" placeholder="43999999999" value={sendForm.numero}
                    onChange={e => setSendForm(f => ({ ...f, numero: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mensagem</label>
                  <textarea className="form-textarea" value={sendForm.mensagem}
                    onChange={e => setSendForm(f => ({ ...f, mensagem: e.target.value }))} />
                </div>
                <button className="btn btn-primary" onClick={handleSend}>
                  <Icon name="send" size={14} /> Enviar Mensagem
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <Icon name="whatsapp" size={48} />
              <h3>Não conectado</h3>
              <p>Clique em "Conectar WhatsApp" para começar</p>
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Respostas Rápidas</h3>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowTemplateModal(true)}><Icon name="plus" size={13} /> Novo</button>
          </div>
          {templates.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p style={{ fontSize: 13 }}>Nenhum template cadastrado</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templates.map(t => (
                <div key={t.id} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                  onClick={() => setSendForm(f => ({ ...f, mensagem: t.mensagem }))}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{t.nome}</span>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>{t.categoria}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {t.mensagem.length > 100 ? t.mensagem.slice(0, 100) + '...' : t.mensagem}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Flows info */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Fluxos Automáticos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {(flows.length ? flows : [
            { nome: 'Boas-vindas', desc: 'Enviado ao primeiro contato de um novo número', status: true },
            { nome: 'Coleta de Dados', desc: 'Solicita CPF, placa e serviço automaticamente', status: true },
            { nome: 'Lembrete de Vencimento', desc: 'Avisa sobre licenciamento próximo ao vencimento', status: false },
          ]).map(f => (
            <div key={f.nome} style={{
              padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)',
              borderLeft: `3px solid ${(f.ativo ?? f.status) ? 'var(--green)' : 'var(--bg-border)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{f.nome}</span>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer'}}>
                  <input type="checkbox" checked={!!(f.ativo ?? f.status)} onChange={()=>toggleFlow(f.id)} style={{accentColor:'var(--accent)'}}/>
                  <span className={`badge ${(f.ativo ?? f.status) ? 'badge-green' : 'badge-gray'}`}>{(f.ativo ?? f.status) ? 'Ativo' : 'Inativo'}</span>
                </label>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      {showTemplateModal&&<TemplateModal onSave={handleSaveTemplate} onClose={()=>setShowTemplateModal(false)}/>}
    </div>
  );
}

function TemplateModal({ onSave, onClose }) {
  const [form, setForm] = useState({nome:'',categoria:'atendimento',mensagem:''});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=e=>{
    e.preventDefault();
    if(!form.nome.trim()||!form.mensagem.trim()){ alert('Informe nome e mensagem'); return; }
    onSave(form);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nova Resposta Rápida</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <form onSubmit={submit}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={form.nome} maxLength={80} onChange={e=>set('nome',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Categoria</label><input className="form-input" value={form.categoria} maxLength={40} onChange={e=>set('categoria',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Mensagem *</label><textarea className="form-textarea" value={form.mensagem} maxLength={1000} onChange={e=>set('mensagem',e.target.value)}/></div>
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
