import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSong, getComments, postComment } from '../api/musicApi';
import { getSongLeaderboard } from '../api/gameApi';
import { getCoverUrl } from '../api/musicApi';
import { formatTime, formatDate } from '../utils/formatTime';
import { formatNumber } from '../utils/formatTime';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import ShareModal from '../components/social/ShareModal';
import { getFriends } from '../api/socialApi';
import { toast } from '../components/common/Toast';

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [comments, setComments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbDifficulty, setLbDifficulty] = useState('hard');
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [friends, setFriends] = useState([]);

  const loadLeaderboard = async (diff) => {
    try {
      const lbRes = await getSongLeaderboard(id, diff);
      setLeaderboard(Array.isArray(lbRes.data) ? lbRes.data : []);
    } catch (_) {
      setLeaderboard([]);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const results = await Promise.allSettled([
          getSong(id),
          getComments(id),
          getSongLeaderboard(id, lbDifficulty),
          getFriends()
        ]);
        if (results[0].status === 'fulfilled') {
          setSong(results[0].value.data);
        } else {
          toast('Failed to load song', 'error');
        }
        setComments(results[1].status === 'fulfilled' ? (results[1].value.data || []) : []);
        setLeaderboard(results[2].status === 'fulfilled' ? (results[2].value.data || []) : []);
        setFriends(results[3].status === 'fulfilled' ? (results[3].value.data || []) : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [id]);

  useEffect(() => {
    if (song) loadLeaderboard(lbDifficulty);
  }, [lbDifficulty]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const { data } = await postComment(id, newComment);
      setComments(prev => [data, ...prev]);
      setNewComment('');
    } catch (err) {
      toast('Failed to post comment', 'error');
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <Loader size={60} />;
  if (!song) return <div className="page-content">Song not found</div>;

  const cover = getCoverUrl(song.cover_url);

  return (
    <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div style={{ width: 240, height: 240, borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
          {cover ? <img src={cover} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ background: 'var(--bg-elevated)', width: '100%', height: '100%' }}/>}
        </div>
        <div>
          <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Song</p>
          <h1 style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1.1, margin: '0.5rem 0' }}>{song.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            {song.artist && (
              <span 
                style={{ color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => navigate(`/artist/${song.artist_id}`)}
              >
                {song.artist.name}
              </span>
            )}
            <span>•</span>
            <span>{formatTime(song.duration_sec)}</span>
            <span>•</span>
            <span>{formatNumber(song.play_count)} plays</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '3rem' }}>
        <Button variant="primary" size="lg" onClick={() => navigate(`/game/mode/${song.id}`)}>
          Play Rhythm Game
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setShowShare(true)}>
          Share
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <section>
          <h2 className="section-title">Comments</h2>
          <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Add a comment..." 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button type="submit" loading={posting} disabled={!newComment.trim()}>Post</Button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '1rem' }}>
                <Avatar src={c.user?.avatar_url} name={c.user?.username || '?'} size={40} />
                <div style={{ background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.user?.username || 'Unknown'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.created_at ? formatDate(c.created_at) : ''}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{c.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No comments yet.</p>}
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section-title">Leaderboard</h2>
            <select className="input" value={lbDifficulty} onChange={e => setLbDifficulty(e.target.value)} style={{ width: 120 }}>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
              <option value="insane">Insane</option>
            </select>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius)', padding: '1rem' }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No scores yet. Be the first!</p>
            ) : (
              leaderboard.map((lb, idx) => (
                <div key={lb.user?.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: idx < leaderboard.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 700, color: idx === 0 ? 'var(--color-primary-light)' : 'var(--text-muted)', width: 20 }}>#{lb.rank || idx + 1}</span>
                    <Avatar src={lb.user?.avatar_url} name={lb.user?.username || '?'} size={32} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{lb.user?.username}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>{formatNumber(lb.best_score)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lb.best_accuracy != null ? `${(lb.best_accuracy * 100).toFixed(1)}%` : ''}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <ShareModal 
        isOpen={showShare} 
        onClose={() => setShowShare(false)} 
        itemType="song" 
        itemId={song.id} 
        itemTitle={song.title} 
        friends={friends} 
      />
    </div>
  );
}
