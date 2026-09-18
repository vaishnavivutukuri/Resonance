import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { markNotificationSeen } from '../../api/socialApi';
import { Search, Bell, ChevronLeft, ChevronRight, Swords, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './TopBar.css';

export default function TopBar() {
  const navigate = useNavigate();
  const { unreadCount, notifications, fetchNotifications } = useSocket();
  const [showNotifs, setShowNotifs] = useState(false);
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleNotifClick = async (notif) => {
    try {
      await markNotificationSeen(notif.id);
      await fetchNotifications();
    } catch (_) {}
    setShowNotifs(false);

    if (notif.message?.startsWith('duel_invite:')) {
      const matchId = notif.message.split(':')[1];
      navigate(`/duel/lobby/${matchId}`);
    } else if (notif.item_type === 'song') {
      navigate(`/song/${notif.item_id}`);
    } else if (notif.item_type === 'playlist') {
      navigate(`/playlist/${notif.item_id}`);
    }
  };

  return (
    <header className="topbar glass">
      <div className="topbar__nav">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="topbar__nav-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /></motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="topbar__nav-btn" onClick={() => navigate(1)}><ChevronRight size={20} /></motion.button>
      </div>

      <form className="topbar__search" onSubmit={handleSearch}>
        <Search className="topbar__search-icon" size={18} />
        <input
          type="search"
          placeholder="Search songs, artists, albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="topbar__search-input"
          id="topbar-search"
        />
      </form>

      <div className="topbar__actions">
        <div className="topbar__notif-wrapper">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="topbar__action-btn"
            onClick={() => setShowNotifs((v) => !v)}
            id="topbar-notifications-btn"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="topbar__notif-dot">{unreadCount}</span>}
          </motion.button>
          
          <AnimatePresence>
            {showNotifs && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="topbar__notif-dropdown glass-panel"
              >
                <p className="topbar__notif-title">Notifications</p>
                {notifications.length === 0 && (
                  <p className="topbar__notif-empty">No notifications yet</p>
                )}
                <div className="topbar__notif-list">
                  {notifications.slice(0, 10).map((n) => (
                    <motion.div
                      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      key={n.id}
                      className={`topbar__notif-item ${!n.seen ? 'topbar__notif-item--unread' : ''}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="topbar__notif-icon">
                        {n.message?.startsWith('duel_invite:') ? <Swords size={16} className="text-accent" /> : <Share2 size={16} className="text-primary" />}
                      </div>
                      <div className="topbar__notif-content">
                        <div className="topbar__notif-from">{n.from_user?.username || 'System'}</div>
                        <div className="topbar__notif-msg">
                          {n.message?.startsWith('duel_invite:')
                            ? 'Sent you a duel invite!'
                            : `Shared a ${n.item_type} with you`}
                          {n.message && !n.message.startsWith('duel_invite:') && n.message
                            ? ` — "${n.message}"`
                            : ''}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showNotifs && <div className="topbar__overlay" onClick={() => setShowNotifs(false)} />}
    </header>
  );
}
