import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import './ArtistCard.css';

export default function ArtistCard({ artist }) {
  const navigate = useNavigate();

  return (
    <div className="artist-card" onClick={() => navigate(`/artist/${artist.id}`)}>
      <Avatar src={artist.image_url} name={artist.name} size={140} className="artist-card__avatar" />
      <p className="artist-card__name truncate">{artist.name}</p>
      <p className="artist-card__label">Artist</p>
    </div>
  );
}
