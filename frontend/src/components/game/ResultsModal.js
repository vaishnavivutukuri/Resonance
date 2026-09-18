import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { GRADE_COLORS } from '../../utils/scoring';
import { formatNumber } from '../../utils/formatTime';
import './ResultsModal.css';

export default function ResultsModal({
  isOpen,
  results,
  mode,
  onRetry,
  onClose
}) {
  if (!results) return null;

  const { score, combo, perfect, good, miss, grade, accuracy } = results;
  const gradeColor = GRADE_COLORS[grade] || '#fff';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="results-modal text-center">
        <h2 className="results-modal__title">{mode === 'ranked' ? 'Ranked Cleared' : 'Practice Cleared'}</h2>
        
        <div className="results-modal__grade" style={{ color: gradeColor, textShadow: `0 0 20px ${gradeColor}80` }}>
          {grade}
        </div>
        
        <div className="results-modal__score">
          {formatNumber(score)}
        </div>

        <div className="results-modal__stats">
          <div className="stat-row"><span>Accuracy</span> <span>{(accuracy * 100).toFixed(1)}%</span></div>
          <div className="stat-row"><span>Max Combo</span> <span>{combo}</span></div>
          <div className="stat-divider" />
          <div className="stat-row"><span>Perfect</span> <span style={{ color: GRADE_COLORS.S }}>{perfect}</span></div>
          <div className="stat-row"><span>Good</span> <span style={{ color: GRADE_COLORS.C }}>{good}</span></div>
          <div className="stat-row"><span>Miss</span> <span style={{ color: GRADE_COLORS.F }}>{miss}</span></div>
        </div>

        <div className="results-modal__actions">
          <Button variant="secondary" onClick={onClose} fullWidth>Close</Button>
          <Button variant="primary" onClick={onRetry} fullWidth>Play Again</Button>
        </div>
      </div>
    </Modal>
  );
}
