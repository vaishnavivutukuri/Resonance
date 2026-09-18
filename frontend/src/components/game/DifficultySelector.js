import React from 'react';
import { DIFFICULTIES, DIFFICULTY_META } from '../../utils/difficultyConfig';
import './DifficultySelector.css';

export default function DifficultySelector({ selected, onSelect }) {
  return (
    <div className="diff-selector">
      {DIFFICULTIES.map((d) => {
        const meta = DIFFICULTY_META[d];
        const isActive = selected === d;
        return (
          <button
            key={d}
            className={`diff-btn ${isActive ? 'diff-btn--active' : ''}`}
            onClick={() => onSelect(d)}
            style={{
              '--diff-color': meta.color,
            }}
          >
            <div className="diff-btn__label">{meta.label}</div>
            <div className="diff-btn__desc">{meta.description}</div>
            <div className="diff-btn__stats">
              <span>⚡ {meta.scrollSpeed}</span>
              <span>🛣 {meta.lanes}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
