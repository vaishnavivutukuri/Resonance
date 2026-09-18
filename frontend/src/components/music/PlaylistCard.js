import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCoverUrl } from '../../api/musicApi';
import './PlaylistCard.css';

export default function PlaylistCard({ playlist }) {
  const navigate = useNavigate();
  const cover = getCoverUrl(playlist.cover_url);

  return (
    <div className="playlist-card" onClick={() => navigate(`/playlist/${playlist.id}`)}>
      <div className="playlist-card__art">
        {cover
          ? <img src={cover} alt={playlist.name} />
          : <div className="playlist-card__art-fallback">⊞</div>
        }
        <div className="playlist-card__play-overlay"><span>▶</span></div>
      </div>
      <p className="playlist-card__name truncate">{playlist.name}</p>
      {!playlist.is_public && <p className="playlist-card__private">Private</p>}
    </div>
  );
}
