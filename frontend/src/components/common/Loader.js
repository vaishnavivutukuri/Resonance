import React from 'react';

export default function Loader({ size = 40, message = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem' }}>
      <div style={{
        width: size,
        height: size,
        border: '3px solid rgba(124, 58, 237, 0.2)',
        borderTop: '3px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {message && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{message}</p>}
    </div>
  );
}
