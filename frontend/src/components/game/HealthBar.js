import React from 'react';
import './HealthBar.css';

export default function HealthBar({ health }) {
  const h = Math.max(0, Math.min(100, health));
  const color = h > 50 ? 'var(--color-success)' : h > 20 ? 'var(--color-accent)' : 'var(--color-danger)';

  return (
    <div className="health-bar-container">
      <div className="health-bar-track">
        <div 
          className="health-bar-fill"
          style={{ width: `${h}%`, background: color }}
        />
      </div>
    </div>
  );
}
