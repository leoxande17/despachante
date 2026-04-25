// src/renderer/pages/CaixaPage.jsx — Abertura/fechamento real + movimentos
import React, { useState, useEffect, useCallback } from 'react';
import { api, useToast } from '../App';
import Icon from '../components/Icon';

const fmt = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
const fmtDT = d => d ? new Date(d).toLocaleString('pt-BR') : '-';

const maskMoney = v => {
  const d = v.replace(/\D/g,'');
  if(!d) return '';
  return (parseInt(d,10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2});
};
const parseMoney = v => parseFloat(String(v).replace(/\./g,'').replace(',','.'))||0;

const FORMAS = ['dinheiro','pix','cartao_debito','cartao_credito','boleto','transferencia'];

export default function CaixaPage() {
  const toast = useToast();
  const [caixa, setCaixa]         = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [historico, setHistorico]  = useState([]);
  const [loading, setLoading]      = useState(true);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(null); // 'entrada' | 'saida'
  const [tab, setTab] = useState('atual');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [cx, mv, hist] = await Promise.all([
      api.caixa.getAtual(),
      api.caixa.getMovimentos(),
      api.caixa.getHistorico(),
    ]);
    if(cx.success)   setCaixa(cx.data);
    if(mv.success)   setMovimentos(mv.data);
    if(hist.success) setHistorico(hist.data);
    setLoading(false);
  },[refreshKey]);

  useEffect(()=>{ loadAll(); },[loadAll]);
  const refresh = () => setRefreshKey(k=>k+1);

  const handleAbrir = async data => {
    const r = await api.caixa.abrir(data);
    if(r.success){ toast('Caixa aberto!','success'); setShowAbrirModal(false); refresh(); }
    else toast(r.error||'Erro ao abrir caixa','error');
  };

  const handleFechar = async data => {
    const r = await api.caixa.fechar(data);
    if(r.success){ toast('Caixa fechado com sucesso!','success'); setShowFecharModal(false); refresh(); }
    else toast(r.error||'Erro ao fechar caixa','error');
  };

  const handleAddMovimento = async data => {
    const r = await api.caixa.addMovimento({...data, tipo: showMovModal});
    const tipoMsg = showMovModal === 'entrada' ? 'Entrada' : 'Saída';
    if(r.success){ toast(tipoMsg + ' registrada!', 'success'); setShowMovModal(null); refresh(); }
    else toast(r.error || 'Erro ao registrar', 'error');
  };

  // Totais
  const totalEntradas = movimentos.filter(m=>m.tipo==='entrada').reduce((s,m)=>s+m.valor,0);
  const totalSaidas   = movimentos.filter(m=>m.tipo==='saida').reduce((s,m)=>s+m.valor,0);
  const saldoAtual    = (caixa?.valor_inicial||0) + totalEntradas - totalSaidas;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de Caixa</h1>
          <p className="page-subtitle">Abertura, movimentos e fechamento diário</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={refresh}><Icon name="refresh" size={14}/> Atualizar</button>
          {!caixa || caixa.status!=='aberto'
            ? <button className="btn btn-primary" onClick={()=>setShowAbrirModal(true)}><Icon name="plus" size={15}/> Abrir Caixa</button>
            : <button className="btn btn-danger"  onClick={()=>setShowFecharModal(true)}><Icon name="lock" size={15}/> Fechar Caixa</button>
          }
        </div>
      </div>

      {loading ? <div className="empty-state">Carregando...</div> : (
        <>
          {/* Status card */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
            {
              (() => {
                const borderColor = caixa?.status === 'aberto' ? 'var(--green)' : 'var(--text-muted)';
                const borderStyle = '3px solid ' + borderColor;
                return (
                  <div className="stat-card" style={{borderLeft: borderStyle}}>
                    <div className="stat-label">Status do Caixa</div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:caixa?.status==='aberto'?'var(--green)':'var(--text-muted)',boxShadow:caixa?.status==='aberto'?'0 0 8px var(--green)':''}}/>
                      <div className="stat-value" style={{fontSize:18}}>{caixa?.status==='aberto'?'Aberto':'Fechado'}</div>
                    </div>
                    {caixa?.status==='aberto'&&<div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>Desde {fmtDT(caixa.data_abertura)}</div>}
                  </div>
                );
              })()
            }
            <div className="stat-card">
              <div className="stat-label">Saldo Inicial</div>
              <div className="stat-value">{fmt(caixa?.valor_inicial||0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Entradas</div>
              <div className="stat-value" style={{color:'var(--green)'}}>{fmt(totalEntradas)}</div>
              <div className="stat-delta">{movimentos.filter(m=>m.tipo==='entrada').length} movimentos</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Saldo Atual</div>
              <div className="stat-value" style={{color:'var(--accent)'}}>{fmt(saldoAtual)}</div>
              <div className="stat-delta negative">{fmt(totalSaidas)} em saídas</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs" style={{marginBottom:16}}>
            <button className={'tab-btn ' + (tab === 'atual' ? 'active' : '')} onClick={() => setTab('atual')}>Caixa Atual</button>
            <button className={'tab-btn ' + (tab === 'historico' ? 'active' : '')} onClick={() => setTab('historico')}>Histórico</button>
          </div>

          {tab==='atual' && (
            <>
              {caixa?.status==='aberto' && (
                <div style={{display:'flex',gap:8,marginBottom:16}}>
                  <button className="btn btn-secondary" onClick={()=>setShowMovModal('entrada')}>
                    <Icon name="arrowUp" size={14} color="var(--green)"/> Registrar Entrada
                  </button>
                  <button className="btn btn-secondary" onClick={()=>setShowMovModal('saida')}>
                    <Icon name="arrowDown" size={14} color="var(--red)"/> Registrar Saída
                  </button>
                </div>
              )}

              {!caixa && (
                <div className="empty-state" style={{marginTop:40}}>
                  <Icon name="cash" size={56}/>
                  <h3>Nenhum caixa aberto</h3>
                  <p style={{fontSize:13}}>Clique em "Abrir Caixa" para iniciar o dia</p>
                  <button className="btn btn-primary" onClick={()=>setShowAbrirModal(true)}>
                    <Icon name="plus" size={14}/> Abrir Caixa
                  </button>
                </div>
              )}

              {movimentos.length>0 && (
                <div className="card" style={{padding:0}}>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Tipo</th><th>Descrição</th><th>Forma Pag.</th><th>Valor</th><th>Horário</th></tr>
                      </thead>
                      <tbody>
                        {movimentos.map(m=>(
                          <tr key={m.id}>
                            <td>
                              <span className={'badge ' + (m.tipo === 'entrada' ? 'badge-green' : 'badge-red')}>
                                {m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                              </span>
                            </td>
                            <td style={{color:'var(--text-primary)',fontWeight:500}}>{m.descricao}</td>
                            <td style={{fontSize:12}}>{m.forma_pagamento||'-'}</td>
                            <td style={{fontFamily:'Syne',fontWeight:700,color:m.tipo==='entrada'?'var(--green)':'var(--red)'}}>
                              {m.tipo==='entrada'?'+':'-'}{fmt(m.valor)}
                            </td>
                            <td style={{fontSize:12,color:'var(--text-muted)'}}>{fmtDT(m.criado_em)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{background:'var(--bg-elevated)'}}>
                          <td colSpan={3} style={{padding:'12px 14px',fontWeight:700,fontSize:13}}>SALDO DO CAIXA</td>
                          <td colSpan={2} style={{padding:'12px 14px',fontFamily:'Syne',fontWeight:800,fontSize:18,color:'var(--accent)'}}>
                            {fmt(saldoAtual)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {movimentos.length===0&&caixa&&(
                <div className="empty-state" style={{marginTop:20}}>
                  <Icon name="cash" size={40}/>
                  <p style={{fontSize:13}}>Nenhum movimento registrado ainda</p>
                </div>
              )}
            </>
          )}

          {tab==='historico' && (
            <div>
              {historico.length===0 && (
                <div className="empty-state" style={{marginTop:40}}>
                  <Icon name="calendar" size={48}/>
                  <p>Nenhum caixa fechado ainda</p>
                </div>
              )}
              {historico.map(h=>{
                const ents = (h.movimentos||[]).filter(m=>m.tipo==='entrada').reduce((s,m)=>s+m.valor,0);
                const sais = (h.movimentos||[]).filter(m=>m.tipo==='saida').reduce((s,m)=>s+m.valor,0);
                return (
                  <div key={h.id} className="card" style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>Caixa fechado por {h.usuario_nome}</div>
                        <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>
                          {fmtDT(h.data_abertura)} → {fmtDT(h.data_fechamento)}
                        </div>
                        {h.observacoes&&<div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{h.observacoes}</div>}
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:'Syne',fontSize:20,fontWeight:800,color:'var(--accent)'}}>{fmt(h.valor_final||0)}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>valor final declarado</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:16,marginTop:12,fontSize:12}}>
                      <span>Inicial: <strong>{fmt(h.valor_inicial)}</strong></span>
                      <span style={{color:'var(--green)'}}>Entradas: <strong>{fmt(ents)}</strong></span>
                      <span style={{color:'var(--red)'}}>Saídas: <strong>{fmt(sais)}</strong></span>
                      <span>{(h.movimentos||[]).length} movimentos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showAbrirModal&&<AbrirModal onAbrir={handleAbrir} onClose={()=>setShowAbrirModal(false)}/>}
      {showFecharModal&&<FecharModal caixa={caixa} saldoAtual={saldoAtual} onFechar={handleFechar} onClose={()=>setShowFecharModal(false)}/>}
      {showMovModal&&<MovimentoModal tipo={showMovModal} onSave={handleAddMovimento} onClose={()=>setShowMovModal(null)}/>}
    </div>
  );
}

function AbrirModal({ onAbrir, onClose }) {
  const [valorInicial, setValorInicial] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>Abrir Caixa</h3><button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button></div>
        <div style={{marginBottom:16,padding:12,background:'var(--bg-elevated)',borderRadius:'var(--radius)',fontSize:13,color:'var(--text-secondary)'}}>
          Informe o valor em caixa no momento da abertura (troco disponível).
        </div>
        <div className="form-group">
          <label className="form-label">Valor Inicial (R$)</label>
          <input className="form-input" inputMode="numeric" value={valorInicial}
            onChange={e=>setValorInicial(maskMoney(e.target.value))} placeholder="0,00"
            style={{fontFamily:'monospace',fontSize:16}}/>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>onAbrir({valor_inicial:parseMoney(valorInicial),usuario_nome:'Carlos Silva'})}>
            <Icon name="check" size={14}/> Abrir Caixa
          </button>
        </div>
      </div>
    </div>
  );
}

function FecharModal({ caixa, saldoAtual, onFechar, onClose }) {
  const [valorFinal, setValorFinal] = useState(saldoAtual.toLocaleString('pt-BR',{minimumFractionDigits:2}));
  const [obs, setObs] = useState('');
  const esperado = saldoAtual;
  const declarado = parseMoney(valorFinal);
  const diferenca = declarado - esperado;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>Fechar Caixa</h3><button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button></div>
        <div style={{padding:14,background:'var(--bg-elevated)',borderRadius:'var(--radius)',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}>
            <span style={{color:'var(--text-muted)'}}>Saldo esperado:</span>
            <span style={{fontFamily:'Syne',fontWeight:700}}>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(esperado)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
            <span style={{color:'var(--text-muted)'}}>Diferença:</span>
            <span style={{fontFamily:'Syne',fontWeight:700,color:diferenca===0?'var(--green)':diferenca>0?'var(--blue)':'var(--red)'}}>
              {diferenca>0?'+':''}{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(diferenca)}
            </span>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-group">
            <label className="form-label">Valor em Caixa (contagem física, R$)</label>
            <input className="form-input" inputMode="numeric" value={valorFinal}
              onChange={e=>setValorFinal(maskMoney(e.target.value))} style={{fontFamily:'monospace',fontSize:16}}/>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={obs} onChange={e=>setObs(e.target.value)} placeholder="Registro de ocorrências..."/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={()=>onFechar({valor_final:parseMoney(valorFinal),observacoes:obs})}>
            <Icon name="lock" size={14}/> Confirmar Fechamento
          </button>
        </div>
      </div>
    </div>
  );
}

function MovimentoModal({ tipo, onSave, onClose }) {
  const [form, setForm] = useState({descricao:'',valor:'',forma_pagamento:'dinheiro'});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const isEntrada = tipo==='entrada';
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{color:isEntrada?'var(--green)':'var(--red)'}}>{isEntrada?'↑ Registrar Entrada':'↓ Registrar Saída'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-group">
            <label className="form-label">Descrição *</label>
            <input className="form-input" required value={form.descricao} maxLength={200}
              onChange={e=>set('descricao',e.target.value)} placeholder={isEntrada?'Ex: Recebimento serviço...':'Ex: Pagamento fornecedor...'}/>
          </div>
          <div className="form-group">
            <label className="form-label">Valor (R$) *</label>
            <input className="form-input" inputMode="numeric" value={form.valor}
              onChange={e=>set('valor',maskMoney(e.target.value))} placeholder="0,00"
              style={{fontFamily:'monospace',fontSize:16}}/>
          </div>
          <div className="form-group">
            <label className="form-label">Forma de Pagamento</label>
            <select className="form-select" value={form.forma_pagamento} onChange={e=>set('forma_pagamento',e.target.value)}>
              {FORMAS.map(f=><option key={f} value={f}>{f.replace(/_/g,' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary"
            style={{background:isEntrada?'var(--green)':'var(--red)',color:'white'}}
            onClick={()=>{ if(!form.descricao||!form.valor){alert('Preencha todos os campos');return;} onSave({...form,valor:parseMoney(form.valor)}); }}>
            {isEntrada?'Registrar Entrada':'Registrar Saída'}
          </button>
        </div>
      </div>
    </div>
  );
}
