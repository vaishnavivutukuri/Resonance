import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import './Social.css';

export default function FriendListItem({ friend, onRemove, onInvite }) {
  const navigate = useNavigate();
  return (
    <div className="friend-item">
      <div 
        className="friend-item__info" 
        onClick={() => navigate(`/profile/${friend.id}`)}
      >
        <Avatar src={friend.avatar_url} name={friend.username} size={40} />
        <div>
          <p className="friend-item__name">{friend.username}</p>
          <p className="friend-item__status">
            <span className="status-dot status-dot--online"></span> Online
          </p>
        </div>
      </div>
      <div className="friend-item__actions">
        {onInvite && (
          <Button variant="primary" size="sm" onClick={() => onInvite(friend)}>
            Duel
          </Button>
        )}
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={() => onRemove(friend.id)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
