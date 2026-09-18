import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { search } from '../api/musicApi';
import SongRow from '../components/music/SongRow';
import AlbumCard from '../components/music/AlbumCard';
import ArtistCard from '../components/music/ArtistCard';
import Loader from '../components/common/Loader';
import { usePlayer } from '../context/PlayerContext';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const { queue } = usePlayer();

  useEffect(() => {
    if (!query) return;
    const fetchSearch = async () => {
      setLoading(true);
      try {
        const { data } = await search(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSearch();
  }, [query]);

  if (!query) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <h2 style={{ color: 'var(--text-muted)' }}>Type in the top bar to search for music...</h2>
      </div>
    );
  }

  if (loading) return <Loader size={60} message={`Searching for "${query}"...`} />;
  if (!results) return null;

  const songs = results.songs || [];
  const albums = results.albums || [];
  const artists = results.artists || [];
  const playlists = results.playlists || [];
  const hasResults = songs.length > 0 || albums.length > 0 || artists.length > 0;

  return (
    <div className="page-content animate-fade-in">
      <h1 className="hero-title">Search results for "{query}"</h1>

      {!hasResults && <p className="mt-4" style={{ color: 'var(--text-muted)' }}>No results found.</p>}

      {songs.length > 0 && (
        <section className="mt-4">
          <h2 className="section-title">Songs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {songs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} queue={songs} />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="mt-4">
          <h2 className="section-title">Albums</h2>
          <div className="grid grid--auto-fill">
            {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section className="mt-4 mb-4">
          <h2 className="section-title">Artists</h2>
          <div className="grid grid--auto-fill">
            {artists.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}
          </div>
        </section>
      )}
    </div>
  );
}
