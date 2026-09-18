import client from './client';

export const getChart = (songId, difficulty) =>
  client.get(`/game/chart/${songId}/${difficulty}`);

export const fetchChart = getChart;

export const getDifficultyConfig = (songId, difficulty) =>
  client.get(`/game/chart/${songId}/${difficulty}/config`);

export const submitSession = (data) => client.post('/game/session', data);

export const submitScore = ({
  songId, difficulty, mode = 'ranked', score, combo, perfect, good, miss, accuracy, result = 'clear',
}) => {
  const total = (perfect || 0) + (good || 0) + (miss || 0);
  const computedAccuracy = accuracy ?? (total > 0 ? ((perfect || 0) + 0.5 * (good || 0)) / total : 0);
  let finalResult = result;
  if (!result || result === 'clear') {
    if ((miss || 0) === 0 && (good || 0) === 0 && total > 0) finalResult = 'perfect';
    else if ((miss || 0) === 0) finalResult = 'clear';
    else finalResult = 'clear';
  }
  return submitSession({
    song_id: songId,
    difficulty,
    mode,
    score,
    accuracy: computedAccuracy,
    max_combo: combo,
    perfect_count: perfect,
    good_count: good,
    miss_count: miss,
    result: finalResult,
  });
};

export const getSongLeaderboard = (songId, difficulty, friendsOnly = false) =>
  client.get(`/game/leaderboard/${songId}/${difficulty}`, { params: { friends_only: friendsOnly } });

export const getGlobalLeaderboard = () => client.get('/game/leaderboard/global');

export const createDuel = (songId, difficulty, mode, opponentId) =>
  client.post('/game/duel/create', {
    song_id: songId,
    difficulty,
    mode,
    opponent_id: opponentId,
  });

export const getDuel = (matchId) => client.get(`/game/duel/${matchId}`);
