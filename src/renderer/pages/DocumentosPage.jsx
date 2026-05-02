// src/renderer/pages/DocumentosPage.jsx
import React, { useState, useEffect } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const TIPOS_DOC = [
  { id: 'cnh',                  label: 'CNH' },
  { id: 'crlv',                 label: 'CRLV' },
  { id: 'comprovante_endereco', label: 'Comp. Endereço' },
  { id: 'identidade',           label: 'RG/Identidade' },
  { id: 'procuracao',           label: 'Procuração' },
  { id: 'contrato',             label: 'Contrato' },
  { id: 'outro',                label: 'Outro' },
];

const STATUS_MAP = {
  pendente:  { badge: 'badge-amber', label: 'Pendente' },
  aprovado:  { badge: 'badge-green', label: 'Aprovado' },
  rejeitado: { badge: 'badge-red',   label: 'Rejeitado' },
};

export default function DocumentosPage() {
  const toast = useToast();
  const [clientes, setClientes]     = useState([]);
  const [clienteId, setClienteId]   = useState('');
  const [processos, setProcessos]   = useState([]);
  const [processoId, setProcessoId] = useState('');
  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    api.crm.getClients({}).then(r => { if (r.success) setClientes(r.data); });
  }, []);

  useEffect(() => {
    setProcessoId(''); setDocs([]);
    if (!clienteId) { setProcessos([]); return; }
    api.processo.list(clienteId).then(r => { if (r.success) setProcessos(r.data); });
  }, [clienteId]);

  useEffect(() => {
    if (!processoId) { setDocs([]); return; }
    loadDocs();
  }, [processoId]);

  const loadDocs = () => {
    setLoading(true);
    api.docs.list(processoId).then(r => {
      if (r.success) setDocs(r.data);
      setLoading(false);
    });
  };

  const handleUpload = async (data) => {
    const res = await api.docs.upload({ ...data, processo_id: processoId, cliente_id: clienteId });
    if (res.success) { toast('Documento enviado!', 'success'); setShowUpload(false); loadDocs(); }
    else toast(res.error || 'Erro ao enviar', 'error');
  };

  const handleStatusChange = async (id, status) => {
    const res = await api.docs.updateStatus({ id, status });
    if (res.success) { toast(`Status: ${STATUS_MAP[status].label}`, 'success'); loadDocs(); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover documento?')) return;
    await api.docs.delete(id);
    toast('Documento removido', 'info');
    loadDocs();
  };

  const [docsDir, setDocsDir] = useState(null);

  useEffect(() => {
    api.docs.getDirectory().then(r => { if (r) setDocsDir(r); });
  }, []);

  const handleSelectDirectory = async () => {
    const dir = await api.docs.selectDirectory();
    if (dir) {
      await api.docs.setDirectory(dir);
      setDocsDir(dir);
      toast('Diretório de documentos configurado!', 'success');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">Gestão eletrônica de documentos por processo</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={handleSelectDirectory} title="Selecionar diretório">
            <Icon name="folder" size={14}/> {docsDir ? 'Alterar Dir' : 'Selecionar Dir'}
          </button>
          {processoId && (
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Icon name="upload" size={15} /> Enviar Documento
            </button>
          )}
        </div>
      </div>

      {/* Seleção cliente + processo */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Cliente</label>
            <select className="form-select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">— Selecione o cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Processo</label>
            <select className="form-select" value={processoId} onChange={e => setProcessoId(e.target.value)} disabled={!clienteId}>
              <option value="">— Selecione o processo —</option>
              {processos.map(p => (
                <option key={p.id} value={p.id}>{p.numero} — {p.servico_nome || p.veiculo_placa || 'Processo'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!clienteId && (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <Icon name="file" size={56} />
          <h3>Selecione um cliente</h3>
          <p style={{ fontSize: 13 }}>Escolha um cliente para visualizar seus documentos</p>
        </div>
      )}

      {clienteId && !processoId && processos.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Selecione um processo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {processos.map(p => (
              <div key={p.id} className="card" style={{ cursor: 'pointer', padding: 16, borderLeft: '3px solid var(--accent)' }}
                onClick={() => setProcessoId(p.id)}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.numero}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.servico_nome} · {p.veiculo_placa || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clienteId && !processoId && processos.length === 0 && clienteId && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <Icon name="file" size={48} />
          <p>Nenhum processo encontrado para este cliente</p>
        </div>
      )}

      {processoId && (
        <>
          {/* Chips de tipo */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {TIPOS_DOC.map(t => {
              const count = docs.filter(d => d.tipo === t.id).length;
              return (
                <div key={t.id} style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: count > 0 ? 'var(--accent-dim)' : 'var(--bg-surface)',
                  border: `1px solid ${count > 0 ? 'rgba(240,165,0,0.25)' : 'var(--bg-border)'}`,
                  color: count > 0 ? 'var(--accent)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {t.label}
                  <span style={{
                    background: count > 0 ? 'var(--accent)' : 'var(--bg-border)',
                    color: count > 0 ? 'var(--bg-base)' : 'var(--text-muted)',
                    borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700,
                  }}>{count}</span>
                </div>
              );
            })}
          </div>

          {loading ? (
            <div className="empty-state"><p>Carregando...</p></div>
          ) : docs.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 40 }}>
              <Icon name="file" size={48} />
              <h3>Nenhum documento</h3>
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                <Icon name="upload" size={14} /> Enviar Documento
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {docs.map(doc => {
                const tipo = TIPOS_DOC.find(t => t.id === doc.tipo);
                const sm = STATUS_MAP[doc.status] || STATUS_MAP.pendente;
                const isImg = doc.mime_type?.includes('image');
                const isPdf = doc.mime_type?.includes('pdf');
                return (
                  <div key={doc.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div
                      style={{ height: 90, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--bg-border)', cursor: 'pointer' }}
                      onClick={() => api.docs.open(doc.id)}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <Icon name="file" size={32} color="var(--text-muted)" />
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{isPdf ? 'PDF' : isImg ? 'Imagem' : 'Arquivo'}</div>
                      </div>
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nome_original}</div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{tipo?.label}</span>
                        <span className={`badge ${sm.badge}`} style={{ fontSize: 10 }}>{sm.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                          onClick={() => api.docs.open(doc.id)}><Icon name="eye" size={11} /> Abrir</button>
                        {doc.status !== 'aprovado' && (
                          <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)' }}
                            onClick={() => handleStatusChange(doc.id, 'aprovado')}><Icon name="check" size={11} /></button>
                        )}
                        {doc.status !== 'rejeitado' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(doc.id, 'rejeitado')}><Icon name="x" size={11} /></button>
                        )}
                        <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(doc.id)}><Icon name="trash" size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showUpload && (
        <UploadModal onUpload={handleUpload} onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
}

function UploadModal({ onUpload, onClose }) {
  const [tipo, setTipo] = useState('cnh');
  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');

  const handleSelectFile = async () => {
    const path = await api.docs.selectFile();
    if (path) { setFilePath(path); setFileName(path.split(/[\\/]/).pop()); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Enviar Documento</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Tipo de Documento</label>
            <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPOS_DOC.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Arquivo *</label>
            <div
              style={{ border: `2px dashed ${filePath ? 'var(--accent)' : 'var(--bg-border)'}`, borderRadius: 'var(--radius-lg)', padding: 28, textAlign: 'center', cursor: 'pointer', background: filePath ? 'var(--accent-dim)' : 'var(--bg-elevated)' }}
              onClick={handleSelectFile}
            >
              {filePath ? (
                <><Icon name="check" size={24} color="var(--accent)" /><div style={{ marginTop: 8, fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{fileName}</div></>
              ) : (
                <><Icon name="upload" size={28} color="var(--text-muted)" /><div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>Clique para selecionar</div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PDF, JPG, PNG, DOC</div></>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!filePath}
            onClick={() => onUpload({ tipo, file_path: filePath, nome_original: fileName })}>
            <Icon name="upload" size={14} /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
