import { useEffect, useRef, useState, useCallback } from 'react';
import { calculateScore } from '../utils/scoring';
import {
  DIFFICULTY_META, TILE_HEIGHT, TILE_GAP, HOLD_TICK_MS, HOLD_TICK_SCORE,
  HIT_LINE_Y_RATIO,
  INITIAL_HEALTH, HEALTH_LOSS_MISS, HEALTH_GAIN_PERFECT, HEALTH_GAIN_GOOD,
  TILE_TIER_COLORS,
} from '../utils/difficultyConfig';

export function useGameEngine({
  audioRef,
  chartData,
  difficulty,
  mode,
  onTick,
  onDie,
  onFinish,
}) {
  const canvasRef = useRef(null);
  const reqRef = useRef();
  const pressedLanes = useRef(new Set());

  const state = useRef({
    health: INITIAL_HEALTH,
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfectCount: 0,
    goodCount: 0,
    missCount: 0,
    isDead: false,
    isFinished: false,
    startTimeMs: 0,
    notes: [],
    particles: [],
    judgementFlash: null,
    lastTickTime: 0,
    startOffsetMs: 0,
  });

  const [uiState, setUiState] = useState({
    health: INITIAL_HEALTH,
    score: 0,
    combo: 0,
    maxCombo: 0,
    isDead: false,
  });

  const config = DIFFICULTY_META[difficulty] || DIFFICULTY_META.normal;

  const normalizeChart = (raw) => {
    if (!Array.isArray(raw)) return [];
    const lanes = 4;
    return raw
      .map((n) => {
        const t = n.time_ms ?? n.time ?? (n.t != null ? n.t * 1000 : null) ?? n.ms;
        let lane = n.lane ?? n.column ?? n.col ?? 0;
        lane = Number(lane);
        if (!Number.isFinite(lane)) lane = 0;
        lane = Math.max(0, Math.min(lanes - 1, Math.floor(lane)));
        const time_ms = Number(t);
        if (!Number.isFinite(time_ms)) return null;
        const duration_ms = Math.max(0, Number(n.duration_ms ?? n.duration ?? n.hold_ms ?? 0) || 0);
        const strength = Math.max(0, Math.min(1, Number(n.strength ?? 0.6)));
        return { time_ms, lane, duration_ms, strength };
      })
      .filter(Boolean)
      .sort((a, b) => a.time_ms - b.time_ms);
  };

  const initGame = useCallback((notesOverride = null, delayMs = 0) => {
    let notesInput = notesOverride;
    let delay = delayMs;
    if (typeof notesOverride === 'number') {
      delay = notesOverride;
      notesInput = null;
    }
    const source = notesInput ?? chartData;
    const sorted = normalizeChart(source);
    state.current = {
      health: INITIAL_HEALTH,
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      isDead: false,
      isFinished: false,
      startTimeMs: performance.now() + delay,
      startOffsetMs: delay,
      notes: sorted.map((n) => ({
        ...n, judged: false, opacity: 1, holding: false,
        holdEnd: n.time_ms + (n.duration_ms || 0),
        ticksAwarded: 0, headTier: null,
      })),
      particles: [],
      judgementFlash: null,
      lastTickTime: performance.now(),
    };
    pressedLanes.current = new Set();
    setUiState({
      health: INITIAL_HEALTH,
      score: 0,
      combo: 0,
      maxCombo: 0,
      isDead: false,
    });
    return sorted.length;
  }, [chartData, difficulty]);

  const getAudioTimeMs = () => {
    if (!audioRef.current) return 0;
    return audioRef.current.currentTime * 1000;
  };

  const spawnParticles = (x, y, color, count = 8) => {
    for (let i = 0; i < count; i++) {
      state.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 1.0,
        color,
      });
    }
  };

  const flashJudgement = (text, color) => {
    state.current.judgementFlash = { text, color, at: performance.now() };
  };

  const updateHealth = (delta) => {
    if (mode === 'practice' && delta < 0) return;
    let h = state.current.health + delta;
    if (h > 100) h = 100;
    if (h <= 0) {
      h = 0;
      state.current.isDead = true;
    }
    state.current.health = h;
  };

  const rescore = () => {
    const res = calculateScore(
      state.current.perfectCount,
      state.current.goodCount,
      state.current.missCount,
      difficulty,
    );
    state.current.score = res.score;
  };

  const syncUi = () => {
    setUiState({
      health: state.current.health,
      score: state.current.score,
      combo: state.current.combo,
      maxCombo: state.current.maxCombo,
      isDead: state.current.isDead,
    });
  };

  const judgeHead = (note, type) => {
    if (type === 'miss') {
      note.judged = true;
      note.opacity = 1;
      state.current.combo = 0;
      state.current.missCount++;
      updateHealth(-HEALTH_LOSS_MISS);
      flashJudgement('MISS', '#E15A5A');
    } else {
      state.current.combo++;
      if (state.current.combo > state.current.maxCombo) {
        state.current.maxCombo = state.current.combo;
      }
      if (type === 'perfect') {
        state.current.perfectCount++;
        updateHealth(HEALTH_GAIN_PERFECT);
        flashJudgement('PERFECT', '#F5E0A8');
      } else {
        state.current.goodCount++;
        updateHealth(HEALTH_GAIN_GOOD);
        flashJudgement('GOOD', '#F7F3E8');
      }
      if ((note.duration_ms || 0) > 0) {
        note.headTier = type;
        note.holding = true;
        note.judged = false;
      } else {
        note.judged = true;
        note.opacity = 0;
      }
    }
    rescore();
    syncUi();
  };

  const laneCenterX = (laneIdx) => {
    const canvas = canvasRef.current;
    const w = (canvas && Number(canvas._cssWidth)) || (canvas && canvas.clientWidth) || 400;
    return ((laneIdx + 0.5) * w) / config.lanes;
  };
  const hitY = () => {
    const canvas = canvasRef.current;
    const h = (canvas && Number(canvas._cssHeight)) || (canvas && canvas.clientHeight) || 600;
    return h * HIT_LINE_Y_RATIO;
  };

  const pressLane = (laneIdx) => {
    if (state.current.isDead || state.current.isFinished) return;
    if (!canvasRef.current) return;
    if (pressedLanes.current.has(laneIdx)) return;
    pressedLanes.current.add(laneIdx);
    const nowAudio = getAudioTimeMs();
    const perfectMs = config.perfectMs ?? config.hitWindowMs / 2;
    const goodMs = config.goodMs ?? config.hitWindowMs;

    let best = null;
    let bestDiff = Infinity;
    for (const n of state.current.notes) {
      if (n.lane !== laneIdx || n.judged || n.holding) continue;
      const d = Math.abs(n.time_ms - nowAudio);
      if (d < bestDiff) {
        bestDiff = d;
        best = n;
      }
      if (n.time_ms - nowAudio > goodMs) break;
    }
    if (!best || bestDiff > goodMs) return;

    if (bestDiff <= perfectMs) {
      judgeHead(best, 'perfect');
      spawnParticles(laneCenterX(laneIdx), hitY(), '#F5E0A8', (best.duration_ms || 0) > 0 ? 12 : 8);
    } else {
      judgeHead(best, 'good');
      spawnParticles(laneCenterX(laneIdx), hitY(), '#F7F3E8', 6);
    }
  };

  const releaseLane = (laneIdx) => {
    pressedLanes.current.delete(laneIdx);
    const nowAudio = getAudioTimeMs();
    const note = state.current.notes.find((n) => n.lane === laneIdx && n.holding && !n.judged);
    if (!note) return;
    const remaining = note.holdEnd - nowAudio;
    note.holding = false;
    if (remaining <= 150) {
      note.judged = true;
      note.opacity = 0;
    } else {
      note.judged = true;
      note.opacity = 0.35;
      state.current.goodCount++;
      rescore();
    }
    syncUi();
  };

  const handleTap = (laneIdx) => pressLane(laneIdx);
  const handleRelease = (laneIdx) => releaseLane(laneIdx);

  const tierOf = (strength) => {
    if (strength >= 0.75) return 'peak';
    if (strength >= 0.4) return 'beat';
    return 'soft';
  };

  const drawTile = (ctx, x, yTop, tw, th, tier, progress = null, held = false) => {
    const c = TILE_TIER_COLORS[tier] || TILE_TIER_COLORS.beat;
    ctx.save();
    ctx.shadowColor = tier === 'peak' ? 'rgba(245,224,168,0.55)' : 'rgba(232,196,118,0.4)';
    ctx.shadowBlur = tier === 'peak' ? 18 : 12;
    const g = ctx.createLinearGradient(0, yTop, 0, yTop + th);
    if (held) {
      g.addColorStop(0, '#FFF3D0');
      g.addColorStop(0.3, '#E8C476');
      g.addColorStop(1, '#3A2E18');
    } else if (tier === 'peak') {
      g.addColorStop(0, '#FFF3D0');
      g.addColorStop(0.25, '#E8C476');
      g.addColorStop(0.6, c.mid);
      g.addColorStop(1, '#14121C');
    } else if (tier === 'beat') {
      g.addColorStop(0, '#F5E0A8');
      g.addColorStop(0.22, '#E8C476');
      g.addColorStop(0.55, '#2A2338');
      g.addColorStop(1, '#14121C');
    } else {
      g.addColorStop(0, '#8A7A55');
      g.addColorStop(0.3, '#4A4232');
      g.addColorStop(1, '#14121C');
    }
    ctx.fillStyle = g;
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(x + r, yTop);
    ctx.arcTo(x + tw, yTop, x + tw, yTop + th, r);
    ctx.arcTo(x + tw, yTop + th, x, yTop + th, r);
    ctx.arcTo(x, yTop + th, x, yTop, r);
    ctx.arcTo(x, yTop, x + tw, yTop, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = tier === 'peak' ? 1.6 : 1.2;
    ctx.stroke();
    ctx.fillStyle = held ? 'rgba(255,243,208,0.95)' : 'rgba(247,243,232,0.8)';
    ctx.fillRect(x + tw * 0.42, yTop + 8, tw * 0.16, Math.max(8, th - 16));
    if (progress != null) {
      ctx.fillStyle = 'rgba(232,196,118,0.35)';
      const ph = th * Math.max(0, Math.min(1, progress));
      ctx.fillRect(x + 3, yTop + th - ph, tw - 6, ph);
    }
  };

  const gameLoop = useCallback((time) => {
    if (state.current.isDead) {
      if (!state.current.isFinished) {
        state.current.isFinished = true;
        onDie?.();
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      reqRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    const ctx = canvas.getContext('2d');
    const cssW = Number(canvas._cssWidth);
    const cssH = Number(canvas._cssHeight);
    const w = (Number.isFinite(cssW) && cssW > 50 ? cssW : null)
      ?? (canvas.clientWidth > 50 ? canvas.clientWidth : null)
      ?? (canvas.width > 50 ? canvas.width : null)
      ?? 400;
    const h = (Number.isFinite(cssH) && cssH > 100 ? cssH : null)
      ?? (canvas.clientHeight > 100 ? canvas.clientHeight : null)
      ?? (canvas.height > 100 ? canvas.height : null)
      ?? 600;
    const laneW = w / config.lanes;
    const hitLineY = h * HIT_LINE_Y_RATIO;
    const pxPerMs = config.scrollSpeed / 1000;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(232,196,118,0.14)';
    ctx.lineWidth = 1;
    for (let i = 1; i < config.lanes; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, h);
      ctx.stroke();
    }
    pressedLanes.current.forEach((l) => {
      ctx.fillStyle = 'rgba(232,196,118,0.08)';
      ctx.fillRect(l * laneW, 0, laneW, h);
    });
    const beam = ctx.createLinearGradient(0, 0, 0, h);
    beam.addColorStop(0, 'rgba(232,196,118,0.07)');
    beam.addColorStop(0.5, 'rgba(232,196,118,0.02)');
    beam.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.shadowColor = 'rgba(232,196,118,0.8)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#E8C476';
    ctx.fillRect(0, hitLineY, w, 3);
    ctx.restore();
    ctx.fillStyle = 'rgba(232,196,118,0.12)';
    ctx.fillRect(0, hitLineY - 26, w, 26);

    const nowAudio = getAudioTimeMs();
    const goodMs = config.goodMs ?? config.hitWindowMs;

    let allJudged = true;
    for (let i = 0; i < state.current.notes.length; i++) {
      const n = state.current.notes[i];
      if (!n.judged && !n.holding) allJudged = false;
      if (n.holding) allJudged = false;
      if (n.judged && n.opacity <= 0) continue;

      const durPx = (n.duration_ms || 0) * pxPerMs;
      const headDiff = n.time_ms - nowAudio;
      const headY = hitLineY - headDiff * pxPerMs;
      const tailY = headY - durPx;
      const x = n.lane * laneW + TILE_GAP / 2;
      const tw = laneW - TILE_GAP;

      if (n.holding && !n.judged) {
        const elapsed = nowAudio - n.time_ms;
        const expectedTicks = Math.floor(Math.max(0, elapsed) / HOLD_TICK_MS);
        if (expectedTicks > (n.ticksAwarded || 0)) {
          const add = expectedTicks - (n.ticksAwarded || 0);
          n.ticksAwarded = expectedTicks;
          state.current.score += add * HOLD_TICK_SCORE;
          if (add > 0 && expectedTicks % 4 === 0) {
            state.current.combo++;
            if (state.current.combo > state.current.maxCombo) state.current.maxCombo = state.current.combo;
          }
          syncUi();
        }
        if (nowAudio >= n.holdEnd - 60) {
          n.holding = false;
          n.judged = true;
          n.opacity = 0;
          spawnParticles((n.lane + 0.5) * laneW, hitLineY, '#F5E0A8', 10);
        }
      }

      if (!n.judged && !n.holding && headDiff < -goodMs) {
        judgeHead(n, 'miss');
      }

      const isHold = (n.duration_ms || 0) > 0;
      const totalH = TILE_HEIGHT + (isHold ? durPx : 0);
      const yTop = (isHold ? tailY : headY) - TILE_HEIGHT;
      if (headY > -totalH && tailY < h + TILE_HEIGHT) {
        const alpha = n.judged ? Math.max(0, n.opacity) : 1;
        ctx.globalAlpha = alpha;
        const tier = tierOf(n.strength ?? 0.6);
        let progress = null;
        if (isHold && (n.holding || !n.judged)) {
          const done = Math.max(0, Math.min(1, (nowAudio - n.time_ms) / Math.max(1, n.duration_ms)));
          progress = done;
        }
        drawTile(ctx, x, yTop, tw, totalH, tier, progress, !!n.holding);
        ctx.globalAlpha = 1;
      }

      if (n.judged && n.opacity > 0 && !n.holding) {
        n.opacity -= 0.15;
      }
    }

    for (let i = state.current.particles.length - 1; i >= 0; i--) {
      const p = state.current.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) {
        state.current.particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const jf = state.current.judgementFlash;
    if (jf && performance.now() - jf.at < 600) {
      const age = (performance.now() - jf.at) / 600;
      ctx.globalAlpha = 1 - age;
      ctx.font = '800 28px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = jf.color;
      ctx.shadowColor = jf.color;
      ctx.shadowBlur = 16;
      ctx.fillText(jf.text, w / 2, hitLineY - 120 - age * 30);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    if (time - state.current.lastTickTime > 250) {
      state.current.lastTickTime = time;
      onTick?.({
        health: state.current.health,
        score: state.current.score,
        combo: state.current.combo,
      });
    }

    const audioEl = audioRef.current;
    const audioEnded = !audioEl || audioEl.ended || (audioEl.duration && nowAudio >= audioEl.duration * 1000 - 200);
    if (allJudged && audioEnded && !state.current.isFinished) {
      state.current.isFinished = true;
      const total = state.current.perfectCount + state.current.goodCount + state.current.missCount;
      const accuracy = total > 0 ? (state.current.perfectCount + 0.5 * state.current.goodCount) / total : 0;
      onFinish?.({
        score: state.current.score,
        combo: state.current.maxCombo,
        perfect: state.current.perfectCount,
        good: state.current.goodCount,
        miss: state.current.missCount,
        accuracy,
      });
    }

    reqRef.current = requestAnimationFrame(gameLoop);
  }, [config, audioRef, difficulty, mode, onTick, onDie, onFinish]);

  useEffect(() => {
    reqRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(reqRef.current);
  }, [gameLoop]);

  useEffect(() => () => { pressedLanes.current = new Set(); }, []);

  return { canvasRef, initGame, handleTap, handleRelease, pressLane, releaseLane, uiState, stateRef: state };
}
