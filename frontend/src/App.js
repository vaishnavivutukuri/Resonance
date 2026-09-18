import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import NowPlayingBar from './components/layout/NowPlayingBar';
import { ToastContainer } from './components/common/Toast';

import Auth from './pages/Auth';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import SongDetail from './pages/SongDetail';
import ArtistProfile from './pages/ArtistProfile';
import GameMode from './pages/GameMode';
import DuelLobby from './pages/DuelLobby';
import DuelMatch from './pages/DuelMatch';

import './styles/global.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function MainLayout({ children }) {
  const { user } = useAuth();
  const { duelInvite, clearDuelInvite } = useSocket();
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          {children}
        </main>
      </div>
      <NowPlayingBar />
      <ToastContainer />

      {duelInvite && user && (
        <div className="duel-invite-overlay">
          <div className="duel-invite-card animate-scale-in">
            <h3>Duel Invite!</h3>
            <p><strong>{duelInvite.from}</strong> has challenged you to a duel!</p>
            <div className="duel-invite-actions">
              <button
                className="btn btn--ghost"
                onClick={() => clearDuelInvite(true)}
              >
                Decline
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  const matchId = duelInvite.matchId;
                  clearDuelInvite(true);
                  navigate(`/duel/lobby/${matchId}`);
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/library" element={<Library />} />
                <Route path="/song/:id" element={<SongDetail />} />
                <Route path="/artist/:id" element={<ArtistProfile />} />
                <Route path="/game/mode/:songId" element={<GameMode />} />
                <Route path="/duel/lobby/:matchId" element={<DuelLobby />} />
                <Route path="/duel/match/:matchId" element={<DuelMatch />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
