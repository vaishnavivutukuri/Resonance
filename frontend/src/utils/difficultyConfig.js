export const DIFFICULTIES = ['easy', 'normal', 'hard', 'insane'];

export const DIFFICULTY_META = {
  easy: {
    label: 'Easy',
    color: '#E8C476',
    description: 'Slow beat stream — verses sparse, chorus gentle',
    scrollSpeed: 220,
    lanes: 4,
    perfectMs: 120,
    goodMs: 250,
    hitWindowMs: 250,
  },
  normal: {
    label: 'Normal',
    color: '#E8C476',
    description: 'Full beat stream with holds on sustained notes',
    scrollSpeed: 340,
    lanes: 4,
    perfectMs: 90,
    goodMs: 180,
    hitWindowMs: 180,
  },
  hard: {
    label: 'Hard',
    color: '#E8C476',
    description: 'Dense 8th-note stream, faster scroll',
    scrollSpeed: 470,
    lanes: 4,
    perfectMs: 70,
    goodMs: 130,
    hitWindowMs: 130,
  },
  insane: {
    label: 'Insane',
    color: '#E8C476',
    description: 'Maximum density + speed, 16th fills in chorus',
    scrollSpeed: 640,
    lanes: 4,
    perfectMs: 50,
    goodMs: 100,
    hitWindowMs: 100,
  },
};

export const TILE_TIER_COLORS = {
  soft: { top: '#8A7A55', mid: '#4A4232', edge: 'rgba(232,196,118,0.35)' },
  beat: { top: '#F5E0A8', mid: '#2A2338', edge: 'rgba(232,196,118,0.65)' },
  peak: { top: '#FFF3D0', mid: '#3A2E18', edge: 'rgba(245,224,168,0.9)' },
};
export const LANE_COLORS = ['#E8C476', '#E8C476', '#E8C476', '#E8C476'];
export const TILE_HEIGHT = 96;
export const TILE_GAP = 2;
export const HOLD_TICK_MS = 100;
export const HIT_LINE_Y_RATIO = 0.88;
export const INITIAL_HEALTH = 100;
export const HEALTH_LOSS_MISS = 10;
export const HEALTH_GAIN_PERFECT = 0.5;
export const HEALTH_GAIN_GOOD = 0;
export const HOLD_TICK_SCORE = 10;
