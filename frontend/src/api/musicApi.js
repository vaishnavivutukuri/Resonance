import client from './client';

export const getSongs = (skip = 0, limit = 50) => client.get('/music/songs', { params: { skip, limit } });
export const getTrending = (limit = 20) => client.get('/music/songs/trending', { params: { limit } });
export const getFeaturedSongs = (limit = 20) => client.get('/music/songs/trending', { params: { limit } });
export const getSong = (id) => client.get(`/music/songs/${id}`);
export const likeSong = (id) => client.post(`/music/songs/${id}/like`);
export const isLiked = (id) => client.get(`/music/songs/${id}/liked`);
export const getLikedSongs = () => client.get('/music/library/liked');
export const getComments = (id) => client.get(`/music/songs/${id}/comments`);
export const postComment = (id, text) => client.post(`/music/songs/${id}/comments`, { text });

export const getArtists = () => client.get('/music/artists');
export const getArtist = (id) => client.get(`/music/artists/${id}`);
export const getArtistSongs = (id) => client.get(`/music/artists/${id}/songs`);
export const getArtistAlbums = (id) => client.get(`/music/artists/${id}/albums`);
export const followArtist = (id) => client.post(`/music/artists/${id}/follow`);
export const getFollowedArtists = () => client.get('/music/library/artists');

export const getAlbum = (id) => client.get(`/music/albums/${id}`);
export const getAlbums = (skip = 0, limit = 20) => client.get('/music/albums', { params: { skip, limit } });
export const getAlbumSongs = (id) => client.get(`/music/albums/${id}/songs`);

export const getPlaylists = () => client.get('/music/playlists');
export const getMyPlaylists = () => client.get('/music/playlists/mine');
export const getPlaylist = (id) => client.get(`/music/playlists/${id}`);
export const createPlaylist = (data) => client.post('/music/playlists', data);
export const updatePlaylist = (id, data) => client.put(`/music/playlists/${id}`, data);
export const deletePlaylist = (id) => client.delete(`/music/playlists/${id}`);
export const addSongToPlaylist = (playlistId, songId, position) =>
  client.post(`/music/playlists/${playlistId}/songs`, { song_id: songId, position });
export const removeSongFromPlaylist = (playlistId, songId) =>
  client.delete(`/music/playlists/${playlistId}/songs/${songId}`);
export const reorderPlaylist = (playlistId, songIds) =>
  client.put(`/music/playlists/${playlistId}/reorder`, { song_ids: songIds });
export const uploadPlaylistCover = (playlistId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return client.post(`/music/playlists/${playlistId}/cover`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadSong = (formData) =>
  client.post('/music/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const rechartSong = (id) => client.post(`/music/songs/${id}/rechart`);

export const search = (q) => client.get('/music/search', { params: { q } });

export const getRecentlyPlayed = () => client.get('/music/home/recent');
export const getFeaturedPlaylists = () => client.get('/music/home/featured');

export const getUserProfile = (id) => client.get(`/music/users/${id}`);
export const getUserPlaylists = (id) => client.get(`/music/users/${id}/playlists`);
export const uploadAvatar = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return client.post('/music/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const getAudioUrl = (audioPath) => {
  if (!audioPath) return null;
  const base = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  if (audioPath.startsWith('http')) return audioPath;
  return `${base}${audioPath}`;
};

export const getCoverUrl = (coverPath) => {
  if (!coverPath) return null;
  const base = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  if (coverPath.startsWith('http')) return coverPath;
  return `${base}${coverPath}`;
};
