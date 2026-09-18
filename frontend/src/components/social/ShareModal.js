import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { toast } from '../common/Toast';
import { shareItem } from '../../api/socialApi';

export default function ShareModal({ isOpen, onClose, itemType, itemId, itemTitle, friends }) {
  const [selectedFriend, setSelectedFriend] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!selectedFriend) {
      toast('Please select a friend to share with', 'error');
      return;
    }
    setLoading(true);
    try {
      await shareItem(selectedFriend, itemType, itemId, message);
      toast('Shared successfully!', 'success');
      onClose();
    } catch (err) {
      toast('Failed to share', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${itemTitle}"`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label>Select Friend</label>
          <select 
            className="input" 
            value={selectedFriend} 
            onChange={(e) => setSelectedFriend(e.target.value)}
          >
            <option value="" disabled>Select a friend...</option>
            {friends.map(f => (
              <option key={f.id} value={f.id}>{f.username}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Message (Optional)</label>
          <input 
            type="text" 
            className="input" 
            placeholder="Check this out!"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Button variant="ghost" onClick={onClose} fullWidth>Cancel</Button>
          <Button variant="primary" onClick={handleShare} loading={loading} fullWidth>Share</Button>
        </div>
      </div>
    </Modal>
  );
}
