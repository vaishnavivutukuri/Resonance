import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socketObj, joinMatch, leaveMatch, sendTick, sendPlayerDead, sendPlayerFinished } from '../api/socket';
import { getSong, getAudioUrl, getUserProfile } from '../api/musicApi';
import { fetchChart, getDuel, submitScore } from '../api/gameApi';
import { useGameEngine } from '../hooks/useGameEngine';
import { usePlayer } from '../context/PlayerContext';
import TileCanvas from '../components/game/TileCanvas';
import DuelStatusBar from '../components/game/DuelStatusBar';
import ResultsModal from '../components/game/ResultsModal';
import Loader from '../components/common/Loader';
import { getGrade } from '../utils/scoring';
import { toast } from '../components/common/Toast';
import './Game.css';

export default function DuelMatch() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [match, setMatch] = useState(location.state?.match || null);
  const [song, setSong] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [gameState, setGameState] = useState('waiting');
  const [results, setResults] = useState(null);
  const [isWinner, setIsWinner] = useState(null);
  const [oppState, setOppState] = useState({ health: 100, score: 0, combo: 0 });
  const [oppProfile, setOppProfile] = useState(null);
  const [loopNumber, setLoopNumber] = useState(0);
  
  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }
  const startTimeout = useRef(null);
  const { pauseGlobal } = usePlayer();

  useEffect(() => {
    pauseGlobal();
  }, [pauseGlobal]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let m = match;
        if (!m) {
          const { data } = await getDuel(matchId);
          m = data;
          if (cancelled) return;
          setMatch(m);
        }
        const [songRes, chartRes] = await Promise.all([
          getSong(m.song_id),
          fetchChart(m.song_id, m.difficulty),
        ]);
        if (cancelled) return;
        setSong(songRes.data);
        const raw = chartRes.data.chart_data || chartRes.data.notes || [];
        const lanes = 4;
        const notes = (Array.isArray(raw) ? raw : [])
          .map((n) => {
            const t = n.time_ms ?? n.time ?? (n.t != null ? n.t * 1000 : null) ?? n.ms;
            let lane = Number(n.lane ?? n.column ?? n.col ?? 0);
            if (!Number.isFinite(lane)) lane = 0;
            lane = Math.max(0, Math.min(lanes - 1, Math.floor(lane)));
            const time_ms = Number(t);
            if (!Number.isFinite(time_ms)) return null;
            const duration_ms = Math.max(0, Number(n.duration_ms ?? n.duration ?? 0) || 0);
            const strength = Math.max(0, Math.min(1, Number(n.strength ?? 0.6)));
            return { time_ms, lane, duration_ms, strength };
          })
          .filter(Boolean)
          .sort((a, b) => a.time_ms - b.time_ms);
        if (!notes.length) {
          toast('No tiles found for this duel chart', 'error');
        }
        setChartData(notes);
        const url = getAudioUrl(songRes.data.audio_url);
        if (url) {
          audioRef.current.src = url;
          audioRef.current.load();
        }
        const myId = String(user?.id);
        const oppId = String(m.player1_id) === myId ? m.player2_id : m.player1_id;
        if (oppId) {
          getUserProfile(oppId).then(r => { if (!cancelled) setOppProfile(r.data); }).catch(() => {});
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          toast('Failed to load duel assets', 'error');
          navigate('/');
        }
      }
    };
    if (user) load();
    return () => {
      cancelled = true;
      if (startTimeout.current) clearTimeout(startTimeout.current);
      try { audioRef.current.pause(); } catch (_) {}
    };
  }, [matchId, user]);

  const scheduleStart = useCallback((startAtMs, loop = 0) => {
    const delay = Math.max(0, startAtMs - Date.now());
    pauseGlobal();
    setLoopNumber(loop);
    setGameState('countdown');
    setCountdown(Math.ceil(delay / 1000));
    const iv = setInterval(() => {
      const remaining = startAtMs - Date.now();
      if (remaining <= 0) {
        clearInterval(iv);
      } else {
        setCountdown(Math.ceil(remaining / 1000));
      }
    }, 200);
    if (startTimeout.current) clearTimeout(startTimeout.current);
    startTimeout.current = setTimeout(() => {
      clearInterval(iv);
      setCountdown(0);
      setGameState('playing');
      const count = initGameRef.current?.(chartRef.current);
      if (!count) {
        toast('No tiles loaded for this duel', 'error');
        return;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => toast('Tap to enable audio', 'warning'));
    }, delay);
  }, []);

  const handleTick = useCallback((s) => {
    sendTick(s.health, s.score, s.combo);
  }, []);

  const handleDie = useCallback(() => {
    try { audioRef.current.pause(); } catch (_) {}
    sendPlayerDead();
    const st = engineStateRef.current;
    setResults({
      score: st?.score ?? 0,
      combo: st?.maxCombo ?? 0,
      perfect: st?.perfectCount ?? 0,
      good: st?.goodCount ?? 0,
      miss: st?.missCount ?? 0,
      accuracy: 0,
      grade: 'F',
    });
    setGameState('results');
    setIsWinner(false);
  }, []);

  const handleFinish = useCallback(async (stats) => {
    sendPlayerFinished();
    try {
      if (match) {
        const accuracy = stats.accuracy ?? 0;
        await submitScore({
          songId: match.song_id,
          difficulty: match.difficulty,
          mode: 'ranked',
          score: stats.score,
          combo: stats.combo,
          perfect: stats.perfect,
          good: stats.good,
          miss: stats.miss,
          accuracy,
          result: 'clear',
        });
      }
    } catch (_) {}
    setResults(prev => prev || {
      ...stats,
      accuracy: stats.accuracy ?? 0,
      grade: getGrade(stats.accuracy ?? 0),
    });
  }, [match]);

  const { canvasRef, initGame, handleTap, handleRelease, uiState, stateRef } = useGameEngine({
    audioRef,
    chartData,
    difficulty: match?.difficulty || 'normal',
    mode: 'ranked',
    onTick: handleTick,
    onDie: handleDie,
    onFinish: handleFinish,
  });

  const initGameRef = useRef(initGame);
  initGameRef.current = initGame;
  const engineStateRef = stateRef;
  const chartRef = useRef(chartData);
  chartRef.current = chartData;

  useEffect(() => {
    if (!user || !match) return;
    joinMatch(matchId);

    const onCountdownStart = (msg) => {
      scheduleStart(msg.start_at_ms, msg.loop_number || 0);
    };
    const onLoopStart = (msg) => {
      try { audioRef.current.currentTime = 0; } catch (_) {}
      scheduleStart(msg.start_at_ms, msg.loop_number || 0);
      toast(`Loop ${msg.loop_number} — speed up!`, 'success');
    };
    const onOppTick = (msg) => {
      setOppState({ health: msg.health ?? 100, score: msg.score ?? 0, combo: msg.combo ?? 0 });
    };
    const onMatchEnd = (msg) => {
      try { audioRef.current.pause(); } catch (_) {}
      const myId = String(user.id);
      const won = String(msg.winner_id) === myId;
      setIsWinner(won);
      const st = engineStateRef.current;
      const stats = {
        score: st?.score ?? 0,
        combo: st?.maxCombo ?? 0,
        perfect: st?.perfectCount ?? 0,
        good: st?.goodCount ?? 0,
        miss: st?.missCount ?? 0,
        accuracy: 0,
      };
      const total = stats.perfect + stats.good + stats.miss;
      stats.accuracy = total > 0 ? (stats.perfect + 0.5 * stats.good) / total : 0;
      stats.grade = getGrade(stats.accuracy);
      setResults(stats);
      setGameState('results');
    };
    const onPlayerDead = (msg) => {
      if (String(msg.user_id) !== String(user.id)) {
        toast('Opponent failed!', 'success');
      }
    };
    const onOppDisconnect = () => {
      toast('Opponent disconnected', 'error');
    };
    const onError = (msg) => {
      const text = typeof msg === 'string' ? msg : msg?.message;
      if (text && text !== 'Room not found') toast(`Duel: ${text}`, 'error');
    };

    socketObj.on('countdown_start', onCountdownStart);
    socketObj.on('loop_start', onLoopStart);
    socketObj.on('opponent_tick', onOppTick);
    socketObj.on('match_end', onMatchEnd);
    socketObj.on('player_dead', onPlayerDead);
    socketObj.on('opponent_disconnected', onOppDisconnect);
    socketObj.on('error', onError);

    return () => {
      socketObj.off('countdown_start', onCountdownStart);
      socketObj.off('loop_start', onLoopStart);
      socketObj.off('opponent_tick', onOppTick);
      socketObj.off('match_end', onMatchEnd);
      socketObj.off('player_dead', onPlayerDead);
      socketObj.off('opponent_disconnected', onOppDisconnect);
      socketObj.off('error', onError);
      leaveMatch(matchId);
      if (startTimeout.current) clearTimeout(startTimeout.current);
    };
  }, [matchId, user, match]);

  if (loading || !match) return <Loader size={60} message="Preparing Arena..." />;

  const meData = {
    username: user?.username || 'You',
    avatar_url: user?.avatar_url,
    score: uiState.score,
    health: uiState.health,
    combo: uiState.combo,
  };
  const oppData = {
    username: oppProfile?.username || 'Opponent',
    avatar_url: oppProfile?.avatar_url,
    score: oppState.score,
    health: oppState.health,
    combo: oppState.combo,
  };

  return (
    <div className="game-arena">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem', zIndex: 50 }}>
        <DuelStatusBar me={meData} opponent={oppData} />
        {loopNumber > 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-primary-light)', fontWeight: 700 }}>Loop {loopNumber}</p>
        )}
      </div>

      {gameState === 'waiting' && (
        <div className="game-arena__countdown" style={{ fontSize: '1.2rem' }}>
          Waiting for both players...
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="game-arena__countdown animate-scale-in">
          {countdown > 0 ? countdown : 'GO!'}
        </div>
      )}

      <div className="game-arena__canvas-container" style={{ marginTop: '80px' }}>
        <TileCanvas 
          canvasRef={canvasRef} 
          onTap={handleTap}
          onRelease={handleRelease}
          lanes={4}
        />
      </div>

      <ResultsModal 
        isOpen={gameState === 'results'}
        results={results ? { ...results, mode: isWinner === null ? 'ranked' : (isWinner ? 'ranked' : 'ranked') } : null}
        mode="ranked"
        onRetry={() => {}}
        onClose={() => navigate(`/duel/lobby/${matchId}`)}
      />
      {gameState === 'results' && isWinner !== null && (
        <div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, textAlign: 'center', zIndex: 60 }}>
          <h2 style={{ color: isWinner ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {isWinner ? 'You Win!' : 'You Lose'}
          </h2>
        </div>
      )}
    </div>
  );
}
