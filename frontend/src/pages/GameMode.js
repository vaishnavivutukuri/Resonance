import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSong, getCoverUrl, getAudioUrl } from '../api/musicApi';
import { fetchChart, submitScore } from '../api/gameApi';
import { useGameEngine } from '../hooks/useGameEngine';
import { usePlayer } from '../context/PlayerContext';
import TileCanvas from '../components/game/TileCanvas';
import DifficultySelector from '../components/game/DifficultySelector';
import ResultsModal from '../components/game/ResultsModal';
import HealthBar from '../components/game/HealthBar';
import ComboCounter from '../components/game/ComboCounter';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import { formatNumber } from '../utils/formatTime';
import { getGrade } from '../utils/scoring';
import { toast } from '../components/common/Toast';
import './Game.css';

export default function GameMode() {
  const { songId } = useParams();
  const navigate = useNavigate();
  
  const [song, setSong] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [difficulty, setDifficulty] = useState('normal');
  const [mode, setMode] = useState('ranked');
  const [loading, setLoading] = useState(true);
  
  const [gameState, setGameState] = useState('setup');
  const [countdown, setCountdown] = useState(3);
  const [results, setResults] = useState(null);

  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }
  const countdownTimer = useRef(null);
  const { pauseGlobal } = usePlayer();

  useEffect(() => {
    pauseGlobal();
  }, [pauseGlobal]);
  
  useEffect(() => {
    const init = async () => {
      try {
        const { data: songData } = await getSong(songId);
        setSong(songData);
      } catch (e) {
        toast('Failed to load song', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    init();
    
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch (_) {}
    };
  }, [songId, navigate]);

  const handleDie = useCallback(() => {
    try { audioRef.current.pause(); } catch (_) {}
    const s = engineRef.current;
    const perfect = s?.perfectCount ?? 0;
    const good = s?.goodCount ?? 0;
    const miss = s?.missCount ?? 0;
    const total = perfect + good + miss;
    const accuracy = total > 0 ? (perfect + 0.5 * good) / total : 0;
    setResults({
      score: s?.score ?? 0,
      combo: s?.maxCombo ?? 0,
      perfect, good, miss,
      accuracy,
      grade: getGrade(accuracy),
    });
    setGameState('results');
  }, []);

  const handleFinish = useCallback(async (res) => {
    const accuracy = res.accuracy ?? 0;
    const final = {
      ...res,
      accuracy,
      grade: getGrade(accuracy),
    };
    setResults(final);
    setGameState('results');
    if (mode === 'ranked') {
      try {
        await submitScore({
          songId,
          difficulty,
          mode: 'ranked',
          score: res.score,
          combo: res.combo,
          perfect: res.perfect,
          good: res.good,
          miss: res.miss,
          accuracy,
          result: res.miss === 0 && res.good === 0 ? 'perfect' : 'clear',
        });
      } catch (e) {
        toast('Failed to submit score to leaderboard', 'error');
      }
    }
  }, [mode, songId, difficulty]);

  const { canvasRef, initGame, handleTap, handleRelease, uiState, stateRef } = useGameEngine({
    audioRef,
    chartData,
    difficulty,
    mode,
    onDie: handleDie,
    onFinish: handleFinish,
  });

  const engineRef = stateRef;

  const startGame = async () => {
    if (!song) return;
    pauseGlobal();
    setLoading(true);
    try {
      const { data } = await fetchChart(songId, difficulty);
      const rawNotes = data.chart_data || data.notes || [];
      const normalize = (raw) => {
        if (!Array.isArray(raw)) return [];
        const lanes = 4;
        return raw
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
      };
      const notes = normalize(rawNotes);
      if (!notes.length) {
        toast('No tiles found for this difficulty — chart may still be generating', 'error');
        setLoading(false);
        return;
      }
      setChartData(notes);
      
      const url = getAudioUrl(song.audio_url);
      if (!url) {
        toast('Song has no audio URL', 'error');
        setLoading(false);
        return;
      }
      audioRef.current.src = url;
      audioRef.current.load();
      
      setGameState('countdown');
      setCountdown(3);
      setLoading(false);
      
      let c = 3;
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      countdownTimer.current = setInterval(() => {
        c -= 1;
        if (c > 0) {
          setCountdown(c);
        } else {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
          setGameState('playing');
          const count = initGame(notes);
          if (!count) {
            toast('No tiles to play — aborting', 'error');
            setGameState('setup');
            return;
          }
          audioRef.current.play().catch(() => toast('Click to start audio', 'warning'));
        }
      }, 800);
      
    } catch (e) {
      toast(e?.response?.status === 404 ? 'Chart not found for this difficulty' : 'Failed to start game', 'error');
      setLoading(false);
    }
  };

  if (loading) return <Loader size={60} />;

  if (gameState === 'setup') {
    return (
      <div className="game-setup page-content animate-fade-in">
        <div className="game-setup__header">
          <img src={getCoverUrl(song?.cover_url)} alt="cover" className="game-setup__cover" />
          <div>
            <p className="text-uppercase" style={{ color: 'var(--color-primary-light)' }}>{mode === 'ranked' ? 'Ranked Run' : 'Solo Practice'}</p>
            <h1>{song?.title}</h1>
            <p className="text-secondary">{song?.artist?.name}</p>
          </div>
        </div>

        <h3 className="mb-4">Select Difficulty</h3>
        <DifficultySelector selected={difficulty} onSelect={setDifficulty} />

        <h3 className="mb-4 mt-4">Select Mode</h3>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <Button variant={mode === 'practice' ? 'primary' : 'ghost'} onClick={() => setMode('practice')}>Practice (no fail)</Button>
          <Button variant={mode === 'ranked' ? 'primary' : 'ghost'} onClick={() => setMode('ranked')}>Ranked (leaderboard)</Button>
        </div>
        
        <div className="mt-4" style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="ghost" size="lg" onClick={() => navigate(-1)}>Back</Button>
          <Button variant="primary" size="lg" onClick={startGame}>Start Game</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-arena">
      <div className="game-arena__hud">
        <div className="game-arena__hud-left">
          <div className="game-arena__score">{formatNumber(uiState.score)}</div>
        </div>
        <div className="game-arena__hud-center">
          <ComboCounter combo={uiState.combo} />
        </div>
        <div className="game-arena__hud-right">
          <HealthBar health={uiState.health} />
        </div>
      </div>

      {gameState === 'countdown' && (
        <div className="game-arena__countdown animate-scale-in">
          {countdown}
        </div>
      )}

      <div className="game-arena__canvas-container">
        <TileCanvas 
          canvasRef={canvasRef} 
          onTap={handleTap}
          onRelease={handleRelease}
          lanes={4}
        />
      </div>

      <ResultsModal 
        isOpen={gameState === 'results'}
        results={results}
        mode={mode}
        onRetry={() => {
          setGameState('setup');
          setCountdown(3);
          setResults(null);
        }}
        onClose={() => navigate(-1)}
      />
    </div>
  );
}
