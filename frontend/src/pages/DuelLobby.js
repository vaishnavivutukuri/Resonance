import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socketObj, joinMatch, leaveMatch } from '../api/socket';
import { getDuel } from '../api/gameApi';
import { getSong, getCoverUrl, getUserProfile } from '../api/musicApi';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { toast } from '../components/common/Toast';
import './Game.css';

export default function DuelLobby() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [match, setMatch] = useState(null);
  const [song, setSong] = useState(null);
  const [p1Profile, setP1Profile] = useState(null);
  const [p2Profile, setP2Profile] = useState(null);
  const [connectedCount, setConnectedCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const { data: matchData } = await getDuel(matchId);
        if (cancelled) return;
        setMatch(matchData);
        const [songRes, p1Res, p2Res] = await Promise.allSettled([
          getSong(matchData.song_id),
          matchData.player1_id ? getUserProfile(matchData.player1_id) : Promise.reject(),
          matchData.player2_id ? getUserProfile(matchData.player2_id) : Promise.reject(),
        ]);
        if (cancelled) return;
        if (songRes.status === 'fulfilled') setSong(songRes.value.data);
        if (p1Res.status === 'fulfilled') setP1Profile(p1Res.value.data);
        if (p2Res.status === 'fulfilled') setP2Profile(p2Res.value.data);
      } catch (e) {
        toast('Failed to load duel', 'error');
        navigate('/');
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => { cancelled = true; };
  }, [matchId, user, navigate]);

  useEffect(() => {
    if (!user || !match) return;
    
    joinMatch(matchId);

    const onJoined = (msg) => {
      if (msg.connected_count) setConnectedCount(msg.connected_count);
    };
    const onCountdown = (msg) => {
      navigate(`/duel/match/${matchId}`, {
        state: {
          match,
          countdownStart: msg,
        },
        replace: true,
      });
    };
    const onError = (msg) => {
      const text = typeof msg === 'string' ? msg : msg?.message || 'Duel error';
      if (text === 'Room not found') {
        toast('Waiting for host... room not ready yet', 'error');
        return;
      }
      toast(`Duel Error: ${text}`, 'error');
    };
    
    socketObj.on('player_joined', onJoined);
    socketObj.on('countdown_start', onCountdown);
    socketObj.on('error', onError);

    return () => {
      socketObj.off('player_joined', onJoined);
      socketObj.off('countdown_start', onCountdown);
      socketObj.off('error', onError);
      leaveMatch(matchId);
    };
  }, [matchId, user, match, navigate]);

  if (loading || !match) return <Loader size={60} message="Joining duel room..." />;

  const p1Name = p1Profile?.username || 'Player 1';
  const p2Name = p2Profile?.username || 'Waiting for opponent...';

  return (
    <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <h1 className="hero-title mb-4">Duel Lobby</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        {match.mode === 'infinite' ? 'Infinite duel — escalating speed until someone fails' : 'Standard duel — highest score wins'} • {match.difficulty} • {connectedCount}/2 connected
      </p>

      {song && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-elevated)', padding: '1rem 2rem', borderRadius: 'var(--border-radius-lg)', marginBottom: '3rem' }}>
          <img src={getCoverUrl(song.cover_url)} alt="cover" style={{ width: 64, height: 64, borderRadius: 8 }} />
          <div>
            <p style={{ fontWeight: 600 }}>{song.title}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Difficulty: {match.difficulty}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '4rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: 160 }}>
          <Avatar src={p1Profile?.avatar_url} name={p1Name} size={100} />
          <h3 style={{ textAlign: 'center' }}>{p1Name}</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>Host</span>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, color: 'var(--color-danger)' }}>
          VS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: 160 }}>
          {match.player2_id ? (
            <>
              <Avatar src={p2Profile?.avatar_url} name={p2Name} size={100} />
              <h3 style={{ textAlign: 'center' }}>{p2Name}</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>{connectedCount >= 2 ? 'Connected' : 'Invited'}</span>
            </>
          ) : (
            <>
              <div style={{ width: 100, height: 100, borderRadius: '50%', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>?</div>
              <h3 style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Waiting...</h3>
            </>
          )}
        </div>
      </div>

      <p style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Waiting for both players to connect... game starts automatically.
      </p>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Button variant="ghost" onClick={() => navigate(-1)}>Leave Lobby</Button>
        <Button variant="primary" onClick={() => navigate(`/duel/match/${matchId}`, { state: { match } })}>Enter Arena</Button>
      </div>
    </div>
  );
}
