import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getArtist } from '../api/musicApi';
import Avatar from '../components/common/Avatar';
import Loader from '../components/common/Loader';
import SongRow from '../components/music/SongRow';
import AlbumCard from '../components/music/AlbumCard';

export default function ArtistProfile() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await getArtist(id);
        setArtist(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) return <Loader size={60} />;
  if (!artist) return <div className="page-content">Artist not found</div>;

  return (
    <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem', textAlign: 'center' }}>
        <Avatar src={artist.image_url} name={artist.name} size={180} className="mb-4" />
        <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>{artist.name}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Artist</p>
      </div>

      {artist.songs && artist.songs.length > 0 && (
        <section className="mb-4">
          <h2 className="section-title">Popular Songs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {artist.songs.slice(0, 5).map((song, i) => (
              <SongRow key={song.id} song={song} index={i} queue={artist.songs} />
            ))}
          </div>
        </section>
      )}

      {artist.albums && artist.albums.length > 0 && (
        <section className="mb-4">
          <h2 className="section-title">Discography</h2>
          <div className="grid grid--auto-fill">
            {artist.albums.map(album => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
