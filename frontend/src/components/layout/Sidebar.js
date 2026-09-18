import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';
import { Home, Search, Library, Play, Trophy, Users, LogOut, Disc3 } from 'lucide-react';
import { motion } from 'framer-motion';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/library', label: 'Your Library', icon: Library },
];

const GAME_NAV = [
  { to: '/game', label: 'Play Game', icon: Play },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const SOCIAL_NAV = [
  { to: '/friends', label: 'Friends', icon: Users },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <Disc3 size={20} color="white" />
        </div>
        <span className="sidebar__logo-text">Resonance</span>
      </div>

      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) => `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
              >
                <span className="sidebar__nav-icon"><Icon size={20} /></span>
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar__divider" />

        <p className="sidebar__section-label">Game</p>
        <ul className="sidebar__nav-list">
          {GAME_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
              >
                <span className="sidebar__nav-icon"><Icon size={20} /></span>
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar__divider" />

        <p className="sidebar__section-label">Social</p>
        <ul className="sidebar__nav-list">
          {SOCIAL_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
              >
                <span className="sidebar__nav-icon"><Icon size={20} /></span>
                <span>{label}</span>
                {label === 'Friends' && unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="sidebar__badge"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {user && (
        <div className="sidebar__footer">
          <NavLink to={`/profile/${user.id}`} className="sidebar__user">
            <Avatar src={user.avatar_url} name={user.username} size={36} />
            <span className="sidebar__username truncate">{user.username}</span>
          </NavLink>
          <motion.button 
            whileHover={{ scale: 1.1, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            whileTap={{ scale: 0.9 }}
            className="sidebar__logout" 
            onClick={handleLogout} 
            title="Log out"
          >
            <LogOut size={18} />
          </motion.button>
        </div>
      )}
    </aside>
  );
}
