import React, { useEffect, useState } from 'react';
import { getFeaturedSongs, getAlbums, getArtists } from '../api/musicApi';
import SongCard from '../components/music/SongCard';
import AlbumCard from '../components/music/AlbumCard';
import ArtistCard from '../components/music/ArtistCard';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Disc3 } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }
  }
};

export default function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const results = await Promise.allSettled([
          getFeaturedSongs(),
          getAlbums(),
          getArtists()
        ]);
        const songsData = results[0].status === 'fulfilled' ? (results[0].value.data || []) : [];
        const albumsData = results[1].status === 'fulfilled' ? (results[1].value.data || []) : [];
        const artistsData = results[2].status === 'fulfilled' ? (results[2].value.data || []) : [];
        setSongs(Array.isArray(songsData) ? songsData.slice(0, 10) : []);
        setAlbums(Array.isArray(albumsData) ? albumsData.slice(0, 10) : []);
        setArtists(Array.isArray(artistsData) ? artistsData.slice(0, 10) : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <Loader size={60} message="Loading your personalized dashboard..." />;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <motion.div 
      className="page-content"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="hero-title">
          <span className="text-secondary">{greeting()},</span><br />
          <span className="gradient-text">{user?.username}</span>
        </h1>
      </motion.div>
      
      <motion.section variants={itemVariants} className="mt-4">
        <h2 className="section-title">
          <Sparkles className="text-primary" size={28} />
          Jump Back In
        </h2>
        {songs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No songs yet — upload music to get started.</p>
        ) : (
        <div className="grid grid--auto-fill">
          {songs.slice(0, 5).map((s, idx) => <SongCard key={s.id || idx} song={s} index={idx} />)}
        </div>
        )}
      </motion.section>

      <motion.section variants={itemVariants} className="mt-4 pt-4">
        <h2 className="section-title">
          <Disc3 className="text-primary" size={28} />
          Recommended Albums
        </h2>
        <div className="grid grid--auto-fill">
          {albums.map((a, idx) => (
            <motion.div key={a.id} whileHover={{ y: -8 }} transition={{ duration: 0.3 }}>
              <AlbumCard album={a} />
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="mt-4 pt-4 mb-4">
        <h2 className="section-title">
          <TrendingUp className="text-accent" size={28} />
          Trending Artists
        </h2>
        <div className="grid grid--auto-fill">
          {artists.map((a, idx) => (
            <motion.div key={a.id} whileHover={{ y: -8 }} transition={{ duration: 0.3 }}>
              <ArtistCard artist={a} />
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
