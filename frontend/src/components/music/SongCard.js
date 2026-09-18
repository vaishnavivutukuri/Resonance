import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext';
import { getCoverUrl } from '../../api/musicApi';
import { motion } from 'framer-motion';
import { Play, Pause, Music } from 'lucide-react';
import './SongCard.css';

export default function SongCard({ song, index = 0 }) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const navigate = useNavigate();
  const cover = getCoverUrl(song.cover_url);
  const isActive = currentSong?.id === song.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`song-card-premium glass-panel ${isActive ? 'active' : ''}`}
      onClick={() => playSong(song, [song], 0)}
    >
      <div className="song-card-art-container">
        {cover ? (
          <img src={cover} alt={song.title} className="song-card-img" />
        ) : (
          <div className="song-card-fallback">
            <Music size={40} className="text-secondary" />
          </div>
        )}
        
        <div className={`song-card-overlay ${isActive && isPlaying ? 'playing' : ''}`}>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="play-button"
          >
            {isActive && isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
          </motion.button>
        </div>
      </div>
      
      <div className="song-card-content">
        <h3 className="song-title truncate">{song.title}</h3>
        <p
          className="song-artist truncate"
          onClick={(e) => {
            e.stopPropagation();
            if(song.artist_id) navigate(`/artist/${song.artist_id}`);
          }}
        >
          {song.artist?.name || 'Unknown Artist'}
        </p>
      </div>
    </motion.div>
  );
}
