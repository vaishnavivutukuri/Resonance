import React, { useEffect, useState } from 'react';
import './ComboCounter.css';

export default function ComboCounter({ combo }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (combo > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 150);
      return () => clearTimeout(timer);
    }
  }, [combo]);

  if (combo < 2) return null;

  return (
    <div className={`combo-counter ${animate ? 'combo-counter--pop' : ''}`}>
      <span className="combo-counter__val">{combo}</span>
      <span className="combo-counter__label">COMBO</span>
    </div>
  );
}
