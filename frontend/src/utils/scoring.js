export const PERFECT_PTS = 100;
export const GOOD_PTS = 50;
export const MISS_PTS = 0;

export const DIFFICULTY_MULT = {
  easy: 1.0,
  normal: 1.25,
  hard: 1.5,
  insane: 2.0,
};

export function calculateScore(perfectCount, goodCount, missCount, difficulty) {
  const total = perfectCount + goodCount + missCount;
  if (total === 0) return { score: 0, accuracy: 0, grade: 'F' };
  const rawScore = perfectCount * PERFECT_PTS + goodCount * GOOD_PTS;
  const accuracy = (perfectCount + 0.5 * goodCount) / total;
  const mult = DIFFICULTY_MULT[difficulty] || 1.0;
  const finalScore = Math.round(rawScore * mult * accuracy);
  const grade = getGrade(accuracy);
  return { score: finalScore, accuracy, grade };
}

export function getGrade(accuracy) {
  if (accuracy >= 0.95) return 'S';
  if (accuracy >= 0.90) return 'A';
  if (accuracy >= 0.80) return 'B';
  if (accuracy >= 0.70) return 'C';
  if (accuracy >= 0.60) return 'D';
  return 'F';
}

export const GRADE_COLORS = {
  S: '#fcd34d',
  A: '#10b981',
  B: '#3b82f6',
  C: '#a855f7',
  D: '#f59e0b',
  F: '#ef4444',
};
