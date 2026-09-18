import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import SongRow from '../music/SongRow';
import { formatDate } from '../../utils/formatTime';
import './Social.css';

export default function ActivityFeedItem({ activity }) {
  const navigate = useNavigate();
  const { user, type, target, created_at } = activity;

  const renderAction = () => {
    switch (type) {
      case 'liked_song': return 'liked a song';
      case 'played_duel': return 'played a ranked duel';
      case 'new_highscore': return 'set a new high score';
      default: return 'did something';
    }
  };

  return (
    <div className="activity-item">
      <div onClick={() => navigate(`/profile/${user.id}`)} style={{ cursor: 'pointer' }}>
        <Avatar src={user.avatar_url} name={user.username} size={48} />
      </div>
      <div className="activity-item__body">
        <div className="activity-item__header">
          <span className="activity-item__user" onClick={() => navigate(`/profile/${user.id}`)}>
            {user.username}
          </span>
          {' '}
          <span style={{ color: 'var(--text-secondary)' }}>{renderAction()}</span>
          <span className="activity-item__time">{formatDate(created_at)}</span>
        </div>
        
        {target && target.type === 'song' && (
          <div className="activity-item__content">
            <SongRow song={target.data} index={0} showIndex={false} />
          </div>
        )}
      </div>
    </div>
  );
}
