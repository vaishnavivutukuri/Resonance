import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications, markNotificationSeen } from '../api/socialApi';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [duelInvite, setDuelInvite] = useState(null);
  const pollRef = useRef(null);
  const seenInviteIds = useRef(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await getNotifications();
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      const unseen = list.filter((n) => !n.seen).length;
      setUnreadCount(unseen);
      const invite = list.find(
        (n) => !n.seen && n.message && n.message.startsWith('duel_invite:') && !seenInviteIds.current.has(n.id)
      );
      if (invite) {
        const matchId = invite.message.split(':')[1];
        setDuelInvite({
          notificationId: invite.id,
          matchId,
          from: invite.from_user?.username || 'A friend',
          fromUser: invite.from_user,
        });
      }
    } catch (_) {}
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setDuelInvite(null);
      seenInviteIds.current.clear();
      return;
    }
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, fetchNotifications]);

  const clearDuelInvite = useCallback(async (markSeen = false) => {
    if (markSeen) {
      setDuelInvite((current) => {
        if (current?.notificationId) {
          seenInviteIds.current.add(current.notificationId);
          markNotificationSeen(current.notificationId).catch(() => {});
          setNotifications((prev) => prev.map(n => n.id === current.notificationId ? { ...n, seen: true } : n));
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return null;
      });
    } else {
      setDuelInvite((current) => {
        if (current?.notificationId) seenInviteIds.current.add(current.notificationId);
        return null;
      });
    }
  }, []);

  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [notif, ...prev]);
    setUnreadCount((c) => c + 1);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        notifications, unreadCount, duelInvite,
        fetchNotifications, clearDuelInvite, addNotification, setDuelInvite,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
