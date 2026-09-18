import hashlib
import logging
import random
from typing import Any, Dict, List, Optional

try:
    import librosa
    import numpy as np
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    logging.warning("librosa not available — chart generation will use fallback BPM-only mode.")

from models import Difficulty
from game_logic import DIFFICULTY_CONFIG

logger = logging.getLogger(__name__)

MIN_GAP_MS = {
    Difficulty.easy: 340,
    Difficulty.normal: 240,
    Difficulty.hard: 170,
    Difficulty.insane: 120,
}
SNAP_TOL_MS = 70.0
HOLD_MIN_MS = 450
HOLD_MAX_MS = 1200
HOLD_SHARE = {
    Difficulty.easy: 0.16,
    Difficulty.normal: 0.12,
    Difficulty.hard: 0.09,
    Difficulty.insane: 0.06,
}


def _seed_for(audio_path: str, difficulty: Difficulty) -> int:
    h = hashlib.md5(f"{audio_path}:{difficulty.value}".encode("utf-8")).hexdigest()
    return int(h[:8], 16)


def _mt3_lanes(
    times_ms: List[float],
    strengths: List[float],
    difficulty: Difficulty,
    seed: int,
) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    cfg = DIFFICULTY_CONFIG[difficulty]
    lanes = 4
    min_gap = MIN_GAP_MS[difficulty]
    notes: List[Dict[str, Any]] = []
    prev_lane = rng.randint(0, lanes - 1)
    prev_lane = (prev_lane + 2) % lanes
    last_time: Optional[float] = None
    for t_ms, s in sorted(zip(times_ms, strengths), key=lambda p: p[0]):
        if t_ms < 300:
            continue
        if last_time is not None and (t_ms - last_time) < min_gap:
            continue
        candidates = [l for l in range(lanes) if l != prev_lane]
        stepwise = [(prev_lane - 1) % lanes, (prev_lane + 1) % lanes]
        stepwise = [l for l in stepwise if l != prev_lane]
        pool = stepwise if rng.random() < 0.7 and stepwise else candidates
        lane = rng.choice(pool)
        prev_lane = lane
        last_time = t_ms
        notes.append({
            "time_ms": int(round(t_ms)),
            "lane": lane,
            "duration_ms": 0,
            "strength": round(max(0.0, min(1.0, float(s))), 3),
        })
    return notes


def _apply_holds(
    notes: List[Dict[str, Any]],
    hold_regions: List[Dict[str, float]],
    difficulty: Difficulty,
) -> List[Dict[str, Any]]:
    if not notes or not hold_regions:
        return notes
    max_holds = max(2, int(len(notes) * HOLD_SHARE[difficulty]))
    holds_used = 0
    out: List[Dict[str, Any]] = []
    for n in notes:
        if holds_used >= max_holds:
            out.append(n)
            continue
        t = n["time_ms"]
        match = None
        for r in hold_regions:
            if r["start_ms"] - 60 <= t <= r["start_ms"] + 120:
                match = r
                break
        if match and n.get("duration_ms", 0) == 0:
            dur = int(max(HOLD_MIN_MS, min(HOLD_MAX_MS, match["end_ms"] - match["start_ms"])))
            out.append({**n, "duration_ms": dur, "strength": 1.0})
            holds_used += 1
            hold_end = t + dur
            hold_regions.remove(match)
            hold_regions.append({"start_ms": 1e12, "end_ms": -1e12})
            n["_hold_end"] = out_skip_until = hold_end
        else:
            out.append(n)
    hold_spans = [(h["time_ms"], h["time_ms"] + h.get("duration_ms", 0)) for h in out if h.get("duration_ms", 0) > 0]
    filtered: List[Dict[str, Any]] = []
    for h in out:
        if h.get("duration_ms", 0) > 0:
            filtered.append({k: v for k, v in h.items() if not k.startswith("_")})
            continue
        inside = any(s < h["time_ms"] < e - 80 for s, e in hold_spans)
        if not inside:
            filtered.append({k: v for k, v in h.items() if not k.startswith("_")})
    return filtered


def _fallback_chart(duration_sec: float, bpm: float, difficulty: Difficulty, seed: int = 42) -> List[Dict]:
    rng = random.Random(seed)
    cfg = DIFFICULTY_CONFIG[difficulty]
    keep_ratio = cfg["onset_keep_ratio"]
    beat_ms = (60.0 / max(40.0, bpm)) * 1000
    eighth_ms = beat_ms / 2
    end_ms = duration_sec * 1000 - 600
    times: List[float] = []
    strengths: List[float] = []
    t = 600.0
    idx = 0
    while t < end_ms:
        pseudo_energy = 0.5 + 0.5 * (0.6 * _sine(idx / 4) + 0.4 * _sine(idx / 16))
        density = keep_ratio * (0.45 + pseudo_energy)
        is_beat = (idx % 2 == 0)
        p = density * (1.35 if is_beat else 0.8)
        if rng.random() < min(0.98, p):
            times.append(t)
            strengths.append(0.65 + 0.35 * pseudo_energy if is_beat else 0.3 + 0.4 * pseudo_energy)
        t += eighth_ms
        idx += 1
    notes = _mt3_lanes(times, strengths, difficulty, seed)
    if difficulty in (Difficulty.easy, Difficulty.normal) and len(notes) > 12:
        step = max(8, len(notes) // 6)
        for i in range(4, len(notes), step):
            if notes[i]["duration_ms"] == 0:
                notes[i] = {**notes[i], "duration_ms": 600, "strength": 1.0}
    return notes


def _sine(x: float) -> float:
    import math
    return (math.sin(x) + 1.0) / 2.0


def _build_chart_from_analysis(
    onset_times_s: "np.ndarray",
    onset_env: "np.ndarray",
    rms: "np.ndarray",
    rms_times_s: "np.ndarray",
    beat_times_s: "np.ndarray",
    bpm: float,
    duration_sec: float,
    difficulty: Difficulty,
    seed: int,
) -> List[Dict]:
    win_s = 8.0
    n_win = max(1, int(duration_sec / win_s) + 1)
    win_energy = []
    for w in range(n_win):
        mask = (rms_times_s >= w * win_s) & (rms_times_s < (w + 1) * win_s)
        win_energy.append(float(np.mean(rms[mask])) if np.any(mask) else 0.0)
    peak = max(win_energy) if win_energy else 1.0
    intensity = [(e / peak) if peak > 0 else 0.5 for e in win_energy]

    def section_of(t_s: float) -> float:
        return intensity[min(int(t_s / win_s), len(intensity) - 1)]

    beat_ms = (60.0 / max(40.0, bpm)) * 1000
    eighth_ms = beat_ms / 2
    snapped: List[float] = []
    strengths: List[float] = []
    onsets_ms = (np.asarray(onset_times_s) * 1000).tolist()
    beats_ms = (np.asarray(beat_times_s) * 1000).tolist() if len(beat_times_s) else []
    for i, t_ms in enumerate(onsets_ms):
        if beats_ms:
            nearest = min(beats_ms, key=lambda b: abs(b - t_ms))
            if abs(nearest - t_ms) <= SNAP_TOL_MS:
                t_ms = nearest
            else:
                t_ms = round(t_ms / eighth_ms) * eighth_ms
        s = 0.5
        if onset_env is not None and len(onset_env):
            ei = min(len(onset_env) - 1, int(i * len(onset_env) / max(1, len(onsets_ms))))
            s = float(onset_env[ei] / (np.max(onset_env) + 1e-6))
        sec = section_of(t_ms / 1000)
        keep_p = DIFFICULTY_CONFIG[difficulty]["onset_keep_ratio"] * (0.45 + sec)
        rng_v = random.Random(seed + i).random()
        if s >= 0.55 or rng_v < keep_p * (0.5 + s):
            snapped.append(t_ms)
            strengths.append(max(s, 0.15 + 0.5 * sec))
    if difficulty == Difficulty.insane and len(snapped) > 4:
        fills = []
        fill_s = []
        for a, b in zip(snapped, snapped[1:]):
            if b - a > 260 and section_of(a / 1000) > 0.55:
                fills.append(a + (b - a) / 2)
                fill_s.append(0.5)
        snapped += fills
        strengths += fill_s
    notes = _mt3_lanes(snapped, strengths, difficulty, seed)
    hold_regions: List[Dict[str, float]] = []
    try:
        times_ms = (np.asarray(rms_times_s) * 1000).tolist()
        vals = np.asarray(rms, dtype=float).tolist()
        if vals:
            mean_v = float(np.mean(vals))
            thr = mean_v * 1.15
            run_start = None
            for tm, v in zip(times_ms, vals):
                if v >= thr:
                    if run_start is None:
                        run_start = tm
                else:
                    if run_start is not None and tm - run_start >= HOLD_MIN_MS:
                        hold_regions.append({"start_ms": run_start, "end_ms": min(tm, run_start + HOLD_MAX_MS)})
                    run_start = None
            if run_start is not None and times_ms and times_ms[-1] - run_start >= HOLD_MIN_MS:
                hold_regions.append({"start_ms": run_start, "end_ms": min(times_ms[-1], run_start + HOLD_MAX_MS)})
    except Exception:
        hold_regions = []
    notes = _apply_holds(notes, hold_regions, difficulty)
    return notes


def generate_chart(
    audio_path: str,
    duration_sec: float,
    difficulty: Difficulty,
    bpm_hint: float = 120.0,
) -> List[Dict[str, Any]]:
    seed = _seed_for(audio_path, difficulty)
    if not LIBROSA_AVAILABLE:
        logger.warning("librosa unavailable, using fallback chart for %s", audio_path)
        return _fallback_chart(duration_sec, bpm_hint, difficulty, seed)
    try:
        y, sr = librosa.load(audio_path, sr=22050, mono=True, duration=min(duration_sec, 300))
        tempo_out = librosa.beat.beat_track(y=y, sr=sr, units="time")
        if isinstance(tempo_out, tuple) and len(tempo_out) == 2:
            tempo, beats = tempo_out
        else:
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
            beats = librosa.frames_to_time(beat_frames, sr=sr)
        try:
            actual_bpm = float(np.atleast_1d(tempo)[0])
        except Exception:
            actual_bpm = float(bpm_hint)
        if not (40 <= actual_bpm <= 240):
            actual_bpm = float(bpm_hint)
        beat_times = np.asarray(beats, dtype=float)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onset_frames = librosa.onset.onset_detect(
            onset_envelope=onset_env, sr=sr,
            units="frames",
            backtrack=True,
            pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.07, wait=10,
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)
        if len(onset_times) < 5:
            logger.info("Very few onsets detected — falling back to BPM chart")
            return _fallback_chart(duration_sec, actual_bpm, difficulty, seed)
        chart = _build_chart_from_analysis(
            onset_times, onset_env, rms, rms_times, beat_times,
            actual_bpm, duration_sec, difficulty, seed,
        )
        logger.info(
            "MT3 chart difficulty=%s: %d notes (%d holds) bpm=%.1f",
            difficulty, len(chart),
            sum(1 for n in chart if n.get("duration_ms", 0) > 0), actual_bpm,
        )
        return chart
    except Exception as exc:
        logger.error("Chart generation failed for %s: %s", audio_path, exc)
        return _fallback_chart(duration_sec, bpm_hint, difficulty, seed)


def generate_all_difficulties(
    audio_path: str,
    duration_sec: float,
    bpm_hint: float = 120.0,
) -> Dict[Difficulty, List[Dict]]:
    return {
        diff: generate_chart(audio_path, duration_sec, diff, bpm_hint)
        for diff in Difficulty
    }
