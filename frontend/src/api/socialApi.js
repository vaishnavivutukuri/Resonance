import client from './client';

export const getFriends = () => client.get('/social/friends');
export const getPendingRequests = () => client.get('/social/friends/requests');
export const sendFriendRequest = (userId) => client.post('/social/friends/request', { user_id: userId });
export const acceptFriendRequest = (id) => client.post(`/social/friends/${id}/accept`);
export const declineFriendRequest = (id) => client.post(`/social/friends/${id}/decline`);
export const removeFriend = (id) => client.delete(`/social/friends/${id}`);
export const searchUsers = (q) => client.get('/social/users/search', { params: { q } });

export const shareItem = (toUserId, itemType, itemId, message) =>
  client.post('/social/share', { to_user_id: toUserId, item_type: itemType, item_id: itemId, message });

export const getNotifications = () => client.get('/social/notifications');
export const markNotificationSeen = (id) => client.post(`/social/notifications/${id}/seen`);

export const getActivityFeed = () => client.get('/social/activity');
