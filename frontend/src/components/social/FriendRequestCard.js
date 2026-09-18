import React from 'react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import './Social.css';

export default function FriendRequestCard({ request, onAccept, onReject }) {
  const user = request.from_user;
  
  return (
    <div className="friend-item">
      <div className="friend-item__info">
        <Avatar src={user.avatar_url} name={user.username} size={40} />
        <div>
          <p className="friend-item__name">{user.username}</p>
          <p className="friend-item__status">Sent a friend request</p>
        </div>
      </div>
      <div className="friend-item__actions">
        <Button variant="primary" size="sm" onClick={() => onAccept(request.id)}>
          Accept
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onReject(request.id)}>
          Decline
        </Button>
      </div>
    </div>
  );
}
