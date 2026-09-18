import React from 'react';
import { getCoverUrl } from '../../api/musicApi';

export default function Avatar({ src, name = '?', size = 40, className = '' }) {
  const url = getCoverUrl(src);
  const initials = name ? name.charAt(0).toUpperCase() : '?';

  const style = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: '50%',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.4,
    fontWeight: 700,
    color: '#fff',
    fontFamily: 'var(--font-display)',
    flexShrink: 0,
  };

  return url ? (
    <img
      src={url}
      alt={name}
      style={{ ...style, objectFit: 'cover' }}
      className={className}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  ) : (
    <div style={style} className={className}>{initials}</div>
  );
}
