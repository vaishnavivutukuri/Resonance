import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import SongRow from './SongRow';
import './Queue.css';

export default function Queue({ onClose }) {
  const { queue, queueIndex, currentSong } = usePlayer();

  return (
    <>
      <div className="queue-overlay" onClick={onClose} />
      <div className="queue animate-slide-right">
        <div className="queue__header">
          <h3>Queue</h3>
          <button className="queue__close" onClick={onClose}>✕</button>
        </div>
        
        <div className="queue__content">
          <div className="queue__section">
            <h4>Now Playing</h4>
            {currentSong ? (
              <SongRow song={currentSong} index={queueIndex} showIndex={false} />
            ) : (
              <p className="queue__empty">Nothing playing</p>
            )}
          </div>

          <div className="queue__section">
            <h4>Next Up</h4>
            {queue.length > 0 && queueIndex < queue.length - 1 ? (
              queue.slice(queueIndex + 1).map((song, i) => (
                <SongRow key={`${song.id}-${i}`} song={song} index={queueIndex + 1 + i} showIndex={false} queue={queue} />
              ))
            ) : (
              <p className="queue__empty">Queue is empty</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
