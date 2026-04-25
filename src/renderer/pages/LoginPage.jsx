// src/renderer/pages/LoginPage.jsx
import React, { useState } from 'react';
import { api, useToast } from '../App';

export default function LoginPage({ onLogin }) {
  const toast = useToast();
  const [form, setForm] = useState({ email: 'admin@despachapr.com', senha: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await api.auth.login(form);
    setLoading(false);
    if (res.success) {
      onLogin({ token: res.token, usuario: res.usuario });
    } else {
      setError(res.error || 'Credenciais inválidas');
      toast(res.error || 'Credenciais inválidas', 'error');
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(240,165,0,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(59,130,246,0.04) 0%, transparent 50%)',
    }}>
      {/* Decorative grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--bg-border) 1px, transparent 1px), linear-gradient(90deg, var(--bg-border) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16, marginBottom: 16,
            background: 'linear-gradient(135deg, var(--accent), #d97706)',
            boxShadow: '0 8px 32px rgba(240,165,0,0.3)',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#0e0f11" strokeWidth="2.5" fill="#0e0f11"/>
              <path d="M9 22V12h6v10" stroke="#0e0f11" strokeWidth="2.5"/>
            </svg>
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, letterSpacing: -0.5, color: 'var(--text-primary)' }}>
            DespachaPR
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            Sistema de Gestão para Despachante
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
          borderRadius: 20, padding: '32px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 24, color: 'var(--text-primary)' }}>
            Entrar no sistema
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                className="form-input" type="email" autoFocus required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com"
                style={{ fontSize: 14 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                className="form-input" type="password" required
                value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                placeholder="••••••••"
                style={{ fontSize: 14 }}
              />
            </div>
            {error && (
              <div style={{
                padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)'
              }}>
                {error}
              </div>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ padding: '12px', fontSize: 14, marginTop: 4, justifyContent: 'center' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Credenciais de demonstração:</div>
            <div>Admin: <span style={{ color: 'var(--accent)' }}>admin@despachapr.com</span> / admin123</div>
            <div>Operador: <span style={{ color: 'var(--blue)' }}>fernanda@despachapr.com</span> / operador123</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          DespachaPR v1.0 · Sistema local offline-first · Paraná, Brasil
        </div>
      </div>
    </div>
  );
}
