import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getAudioUrl } from '../api/musicApi';

const PlayerContext = createContext(null);

export const RepeatMode = { OFF: 'off', ALL: 'all', ONE: 'one' };

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  if (!audioRef.current) {
    const a = new Audio();
    a.preload = 'metadata';
    try {
      const savedVol = parseFloat(localStorage.getItem('player_volume'));
      if (!Number.isNaN(savedVol)) a.volume = Math.min(1, Math.max(0, savedVol));
    } catch (_) {}
    audioRef.current = a;
  }
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('player_volume'));
      return Number.isNaN(v) ? 1 : Math.min(1, Math.max(0, v));
    } catch (_) { return 1; }
  });
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(RepeatMode.OFF);
  const [showQueue, setShowQueue] = useState(false);

  const stateRef = useRef({ queue, queueIndex, repeat, shuffle });
  stateRef.current = { queue, queueIndex, repeat, shuffle };
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => {
      if (Number.isFinite(audio.currentTime)) setCurrentTime(audio.currentTime);
    };
    const onDuration = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };
    const onLoaded = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
      } else if (currentSongRef.current?.duration_sec) {
        setDuration(currentSongRef.current.duration_sec);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      if (currentSongRef.current?.duration_sec) {
        setDuration(currentSongRef.current.duration_sec);
      }
    };
    const onEnded = () => {
      const { queue: q, queueIndex: qi, repeat: r, shuffle: s } = stateRef.current;
      if (r === RepeatMode.ONE) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (!q.length) {
        setIsPlaying(false);
        return;
      }
      let nextIndex;
      if (s) {
        nextIndex = q.length > 1 ? Math.floor(Math.random() * q.length) : 0;
        if (nextIndex === qi && q.length > 1) nextIndex = (qi + 1) % q.length;
      } else {
        nextIndex = qi + 1;
        if (nextIndex >= q.length) {
          if (r === RepeatMode.ALL) {
            nextIndex = 0;
          } else {
            setIsPlaying(false);
            return;
          }
        }
      }
      const nextSong = q[nextIndex];
      if (nextSong) {
        setQueueIndex(nextIndex);
        const url = getAudioUrl(nextSong.audio_url);
        if (url) {
          audio.src = url;
          audio.load();
          setCurrentSong(nextSong);
          setCurrentTime(0);
          audio.play().catch(() => {});
        }
      }
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('canplay', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('canplay', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  useEffect(() => {
    audioRef.current.volume = volume;
    try { localStorage.setItem('player_volume', String(volume)); } catch (_) {}
  }, [volume]);

  const loadSong = useCallback((song) => {
    if (!song) return;
    const audio = audioRef.current;
    const url = getAudioUrl(song.audio_url);
    if (!url) return;
    const absUrl = new URL(url, window.location.href).href;
    const currentAbs = audio.src ? new URL(audio.src, window.location.href).href : null;
    if (currentAbs !== absUrl) {
      audio.src = url;
      audio.load();
    }
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.duration_sec || 0);
  }, []);

  const playSong = useCallback((song, newQueue = null, index = 0) => {
    if (newQueue) {
      setQueue(newQueue);
      const safeIdx = Math.max(0, Math.min(index, newQueue.length - 1));
      setQueueIndex(safeIdx);
    }
    loadSong(song);
    setTimeout(() => audioRef.current.play().catch(() => {}), 0);
  }, [loadSong]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentSong) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentSong]);

  const playNext = useCallback(() => {
    const { queue: q, queueIndex: qi, repeat: r, shuffle: s } = stateRef.current;
    if (!q.length) return;
    let nextIndex;
    if (s) {
      nextIndex = Math.floor(Math.random() * q.length);
    } else {
      nextIndex = qi + 1;
      if (nextIndex >= q.length) {
        if (r === RepeatMode.ALL) {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }
    const nextSong = q[nextIndex];
    if (!nextSong) return;
    setQueueIndex(nextIndex);
    loadSong(nextSong);
    setTimeout(() => audioRef.current.play().catch(() => {}), 0);
  }, [loadSong]);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const { queue: q, queueIndex: qi } = stateRef.current;
    if (!q.length) return;
    const prevIndex = Math.max(0, qi - 1);
    const prevSong = q[prevIndex];
    if (!prevSong) return;
    setQueueIndex(prevIndex);
    loadSong(prevSong);
    setTimeout(() => audio.play().catch(() => {}), 0);
  }, [loadSong]);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    if (!Number.isFinite(time)) return;
    const d = audio.duration || duration;
    const clamped = Math.max(0, Math.min(time, d || time));
    try {
      audio.currentTime = clamped;
    } catch (_) {}
    setCurrentTime(clamped);
  }, [duration]);

  const changeVolume = useCallback((vol) => {
    const v = Math.max(0, Math.min(1, vol));
    setVolume(v);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => {
      if (r === RepeatMode.OFF) return RepeatMode.ALL;
      if (r === RepeatMode.ALL) return RepeatMode.ONE;
      return RepeatMode.OFF;
    });
  }, []);

  const addToQueue = useCallback((song) => {
    if (!song) return;
    setQueue((q) => [...q, song]);
  }, []);

  const removeFromQueue = useCallback((index) => {
    setQueue((q) => q.filter((_, i) => i !== index));
  }, []);

  const getAudioElement = useCallback(() => audioRef.current, []);

  const pauseGlobal = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return false;
    const wasPlaying = !audio.paused;
    try { audio.pause(); } catch (_) {}
    setIsPlaying(false);
    return wasPlaying;
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentSong, queue, queueIndex, isPlaying, currentTime, duration,
        volume, shuffle, repeat, showQueue,
        playSong, togglePlay, playNext, playPrev, seek, changeVolume,
        toggleShuffle, cycleRepeat, addToQueue, removeFromQueue,
        setShowQueue, setQueue, setQueueIndex, getAudioElement, pauseGlobal,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
