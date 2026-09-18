import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCoverUrl } from '../../api/musicApi';
import './AlbumCard.css';

export default function AlbumCard({ album }) {
  const navigate = useNavigate();
  const cover = getCoverUrl(album.cover_url);

  return (
    <div className="album-card" onClick={() => navigate(`/album/${album.id}`)}>
      <div className="album-card__art">
        {cover
          ? <img src={cover} alt={album.title} />
          : <div className="album-card__art-fallback">💿</div>
        }
      </div>
      <p className="album-card__title truncate">{album.title}</p>
      {album.artist && <p className="album-card__artist truncate">{album.artist.name}</p>}
    </div>
  );
}
