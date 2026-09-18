const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

class SocketWrapper {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.roomId = null;
    this.reconnectAttempts = 0;
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    if (!callback) {
      delete this.listeners[event];
      return;
    }
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      [...this.listeners[event]].forEach(cb => {
        try { cb(data); } catch (e) { console.error('WS listener error', e); }
      });
    }
    if (this.listeners['*']) {
      [...this.listeners['*']].forEach(cb => {
        try { cb(event, data); } catch (_) {}
      });
    }
  }

  connect(roomId) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.emit('error', 'No auth token');
      return;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    this.roomId = roomId;
    const url = `${WS_URL}/game/ws/duel/${roomId}?token=${encodeURIComponent(token)}`;
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.emit('error', 'Failed to create WebSocket');
      return;
    }
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected', { roomId });
    };
    this.ws.onclose = () => {
      this.ws = null;
      this.emit('disconnected', { roomId });
    };
    this.ws.onerror = () => {
      this.emit('error', 'Connection error');
    };
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const type = msg.type || 'unknown';
        if (type === 'error') {
          this.emit('error', msg.message || 'Server error');
        } else {
          this.emit(type, msg);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };
  }

  disconnect() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
      this.roomId = null;
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
}

export const socketObj = new SocketWrapper();

export function roomIdForMatch(matchId) {
  if (!matchId) return null;
  return matchId.startsWith('duel_') ? matchId : `duel_${matchId}`;
}

export function joinMatch(matchId) {
  socketObj.connect(roomIdForMatch(matchId));
}

export function leaveMatch(matchId) {
  const expected = roomIdForMatch(matchId);
  if (!expected || socketObj.roomId === expected || socketObj.roomId === matchId) {
    socketObj.disconnect();
  }
}

export function sendTick(health, score, combo) {
  socketObj.send({
    type: 'tick',
    health,
    score,
    combo,
  });
}

export function sendGameState(matchId, score, combo, health) {
  sendTick(health, score, combo);
}

export function sendPlayerDead() {
  socketObj.send({ type: 'player_dead' });
}

export function sendPlayerFinished() {
  socketObj.send({ type: 'player_finished' });
}
