import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext';
import { getCoverUrl } from '../../api/musicApi';
import { formatTime } from '../../utils/formatTime';
import './SongRow.css';

export default function SongRow({ song, index, queue, onLike, liked, showIndex = true }) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const isActive = currentSong?.id === song.id;
  const cover = getCoverUrl(song.cover_url);

  const handlePlay = () => {
    playSong(song, queue || [song], queue ? queue.indexOf(song) : 0);
  };

  return (
    <div
      className={`song-row ${isActive ? 'song-row--active' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={handlePlay}
    >
      <div className="song-row__index">
        {hovered || isActive ? (
          <button className="song-row__play-btn" onClick={handlePlay}>
            {isActive && isPlaying ? '⏸' : '▶'}
          </button>
        ) : (
          showIndex && (
            <span className={`song-row__num ${isActive ? 'song-row__num--active' : ''}`}>
              {isActive && isPlaying ? '▶' : index + 1}
            </span>
          )
        )}
      </div>

      <div className="song-row__info">
        <div className="song-row__cover">
          {cover
            ? <img src={cover} alt={song.title} />
            : <div className="song-row__cover-fallback">♫</div>
          }
        </div>
        <div className="song-row__meta">
          <p className="song-row__title truncate">{song.title}</p>
          <p
            className="song-row__artist truncate"
            onClick={(e) => { e.stopPropagation(); navigate(`/artist/${song.artist_id}`); }}
          >
            {song.artist?.name}
          </p>
        </div>
      </div>

      <div className="song-row__album truncate">
        {song.album && (
          <span
            className="song-row__album-link"
            onClick={(e) => { e.stopPropagation(); navigate(`/album/${song.album_id}`); }}
          >
            {song.album.title}
          </span>
        )}
      </div>

      <div className="song-row__actions">
        <button
          className={`song-row__like-btn ${liked ? 'song-row__like-btn--liked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onLike?.(song.id); }}
        >
          {liked ? '♥' : '♡'}
        </button>
      </div>

      <div className="song-row__duration">{formatTime(song.duration_sec)}</div>
    </div>
  );
}
