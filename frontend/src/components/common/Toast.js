import React, { useEffect, useState } from 'react';
import './Toast.css';

const toastQueue = [];
let setToastsGlobal = null;

export function toast(message, type = 'info', duration = 3500) {
  const id = Date.now() + Math.random();
  const t = { id, message, type };
  toastQueue.push(t);
  if (setToastsGlobal) {
    setToastsGlobal((prev) => [...prev, t]);
    setTimeout(() => {
      setToastsGlobal((prev) => prev.filter((x) => x.id !== id));
    }, duration);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  setToastsGlobal = setToasts;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type} animate-slide-up`}>
          <span className="toast__icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
