// src/renderer/components/ToastContainer.jsx
import React from 'react';
import Icon from './Icon';

const ICONS = { success: 'check', error: 'alert', info: 'info' };
const COLORS = { success: 'var(--green)', error: 'var(--red)', info: 'var(--blue)' };

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <Icon name={ICONS[t.type] || 'info'} size={16} color={COLORS[t.type]} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
