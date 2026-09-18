import React, { useEffect, useState } from 'react';
import { getPlaylists, getLikedSongs } from '../api/musicApi';
import PlaylistCard from '../components/music/PlaylistCard';
import SongRow from '../components/music/SongRow';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import UploadModal from '../components/music/UploadModal';

export default function Library() {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

  const fetchLib = async () => {
    try {
      const [plRes, likedRes] = await Promise.all([
        getPlaylists(),
        getLikedSongs()
      ]);
      setPlaylists(plRes.data);
      setLikedSongs(likedRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLib();
  }, []);

  if (loading) return <Loader size={60} message="Loading your library..." />;

  return (
    <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="hero-title">Your Library</h1>
        <Button variant="primary" onClick={() => setShowUpload(true)}>Upload Song</Button>
      </div>

      <section className="mt-4">
        <h2 className="section-title">Your Playlists</h2>
        {playlists.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You haven't created any playlists yet.</p>
        ) : (
          <div className="grid grid--auto-fill">
            {playlists.map(p => <PlaylistCard key={p.id} playlist={p} />)}
          </div>
        )}
      </section>

      <section className="mt-4 mb-4">
        <h2 className="section-title">Liked Songs</h2>
        {likedSongs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No liked songs yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {likedSongs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} queue={likedSongs} liked={true} />
            ))}
          </div>
        )}
      </section>

      <UploadModal 
        isOpen={showUpload} 
        onClose={() => setShowUpload(false)} 
        onSuccess={fetchLib}
      />
    </div>
  );
}
