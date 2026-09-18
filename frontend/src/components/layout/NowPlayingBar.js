import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer, RepeatMode } from '../../context/PlayerContext';
import { getCoverUrl } from '../../api/musicApi';
import { formatTime } from '../../utils/formatTime';
import Queue from '../music/Queue';
import './NowPlayingBar.css';

function ShuffleIcon({ active }) {
  return <span style={{ color: active ? 'var(--color-primary-light)' : 'inherit' }}>⇌</span>;
}
function RepeatIcon({ mode }) {
  if (mode === RepeatMode.ONE) return <span style={{ color: 'var(--color-primary-light)' }}>↺¹</span>;
  if (mode === RepeatMode.ALL) return <span style={{ color: 'var(--color-primary-light)' }}>↺</span>;
  return <span>↺</span>;
}

export default function NowPlayingBar() {
  const {
    currentSong, isPlaying, currentTime, duration,
    volume, shuffle, repeat, showQueue,
    togglePlay, playNext, playPrev, seek, changeVolume,
    toggleShuffle, cycleRepeat, setShowQueue,
  } = usePlayer();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const coverUrl = getCoverUrl(currentSong?.cover_url);
  const safeDuration = Number.isFinite(duration) && duration > 0
    ? duration
    : (currentSong?.duration_sec || 0);
  const pct = safeDuration > 0
    ? Math.max(0, Math.min(100, (currentTime / safeDuration) * 100))
    : 0;

  const handleSeek = (e) => {
    if (!safeDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * safeDuration);
  };

  if (!currentSong) return null;

  return (
    <>
      {showQueue && <Queue onClose={() => setShowQueue(false)} />}

      {expanded && (
        <div className="player-fullscreen animate-fade-in">
          <button className="player-fullscreen__close" onClick={() => setExpanded(false)}>✕</button>
          <div className="player-fullscreen__content">
            <div className="player-fullscreen__art">
              {coverUrl
                ? <img src={coverUrl} alt={currentSong.title} />
                : <div className="player-fullscreen__art-placeholder">♫</div>
              }
            </div>
            <div className="player-fullscreen__info">
              <h2>{currentSong.title}</h2>
              <p
                className="player-fullscreen__artist"
                onClick={() => { setExpanded(false); navigate(`/artist/${currentSong.artist_id}`); }}
              >
                {currentSong.artist?.name}
              </p>
            </div>
            <div className="player-fullscreen__seek" onClick={handleSeek}>
              <div className="player-fullscreen__progress" style={{ width: `${pct}%` }} />
            </div>
            <div className="player-fullscreen__times">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(safeDuration)}</span>
            </div>
            <div className="player-fullscreen__controls">
              <button onClick={toggleShuffle}><ShuffleIcon active={shuffle} /></button>
              <button onClick={playPrev}>⏮</button>
              <button className="player-fullscreen__play-btn" onClick={togglePlay}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={playNext}>⏭</button>
              <button onClick={cycleRepeat}><RepeatIcon mode={repeat} /></button>
            </div>
            <div className="player-fullscreen__volume">
              <span>🔊</span>
              <input
                type="range" min="0" max="1" step="0.01"
                value={volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      <div className="nowplaying-bar">
        <div className="nowplaying-bar__left" onClick={() => setExpanded(true)}>
          <div className="nowplaying-bar__cover">
            {coverUrl
              ? <img src={coverUrl} alt={currentSong.title} />
              : <div className="nowplaying-bar__cover-placeholder">♫</div>
            }
          </div>
          <div className="nowplaying-bar__song-info">
            <p className="nowplaying-bar__title truncate">{currentSong.title}</p>
            <p className="nowplaying-bar__artist truncate">{currentSong.artist?.name}</p>
          </div>
        </div>

        <div className="nowplaying-bar__center">
          <div className="nowplaying-bar__controls">
            <button className="nowplaying-bar__ctrl-btn" onClick={toggleShuffle}>
              <ShuffleIcon active={shuffle} />
            </button>
            <button className="nowplaying-bar__ctrl-btn" onClick={playPrev}>⏮</button>
            <button className="nowplaying-bar__play-btn" onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="nowplaying-bar__ctrl-btn" onClick={playNext}>⏭</button>
            <button className="nowplaying-bar__ctrl-btn" onClick={cycleRepeat}>
              <RepeatIcon mode={repeat} />
            </button>
          </div>
          <div className="nowplaying-bar__seek-row">
            <span className="nowplaying-bar__time">{formatTime(currentTime)}</span>
            <div className="nowplaying-bar__seek" onClick={handleSeek}>
              <div className="nowplaying-bar__progress" style={{ width: `${pct}%` }} />
            </div>
            <span className="nowplaying-bar__time">{formatTime(safeDuration)}</span>
          </div>
        </div>

        <div className="nowplaying-bar__right">
          <button
            className={`nowplaying-bar__ctrl-btn ${showQueue ? 'nowplaying-bar__ctrl-btn--active' : ''}`}
            onClick={() => setShowQueue((v) => !v)}
            title="Queue"
          >
            ≡
          </button>
          <button
            className="nowplaying-bar__ctrl-btn"
            onClick={() => navigate(`/game/mode/${currentSong.id}`)}
            title="Play as rhythm game"
          >
            ♪
          </button>
          <span className="nowplaying-bar__vol-icon">🔊</span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            className="nowplaying-bar__volume"
          />
        </div>
      </div>
    </>
  );
}
