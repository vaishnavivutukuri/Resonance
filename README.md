# 🎵 Resonance

## What is Resonance?

Resonance is a full-stack, feature-complete music streaming platform fused with a Magic Tiles 3-style rhythm game. It allows users to stream any song completely free — no ads, no paywalls, no currency — and then play that same song as an auto-generated rhythm game with multiple difficulty tiers. Friends can compete in real-time head-to-head tile-tapping duels over WebSockets, track rankings on per-song leaderboards, and interact through a social layer including friend requests, activity feeds, and in-app notifications.

## Key Features

🎶 **Spotify-Parity Music Streaming**
- Register / Login / Logout with JWT authentication (access + refresh tokens)
- Home feed with recently played, featured playlists, and top tracks
- Global search across songs, artists, albums, and playlists
- Full playback controls: play/pause, next/prev, seek, volume, shuffle, repeat modes
- Persistent mini-player + expandable full-screen player + queue view
- Library: Liked Songs, Saved Albums, Followed Artists, Playlists
- Playlist CRUD: create, rename, delete, add/remove/reorder tracks, custom covers
- Like/unlike songs & albums, follow/unfollow artists
- Song upload with title, artist, album, cover, and audio — auto-generates tile charts

🎮 **Magic Tiles 3-Style Rhythm Game**
- 4 difficulty modes: Easy, Normal, Hard, Insane
- Auto-generated tile charts from audio beat and onset detection (via `librosa`)
- Judgment tiers: Perfect / Good / Miss with combo multiplier and a health bar
- Practice mode (no stakes) and Ranked mode (scored and submitted to leaderboard)
- Smooth `requestAnimationFrame` game loop rendered on an HTML5 Canvas
- Keyboard (D F J K) and touch/pointer input support

⚔️ **Real-Time Competitive Duel Mode**
- Invite friends to head-to-head rhythm game duels via WebSocket rooms
- Live sync of opponent health, score, and combo in real-time
- Standard duel (highest score wins) and Infinite escalating-difficulty duel
- Post-duel results screen with winner declaration

🏆 **Ranked Leaderboards**
- Per-song, per-difficulty score rankings
- Global overall leaderboard
- Friends-only filter

👥 **Friends & Social**
- Send, accept, and decline friend requests
- Share songs and playlists to friends with in-app notifications
- Friend activity feed showing plays, likes, and high scores

## Tech Stack

**Backend:**
- **FastAPI** (High-performance async Python web framework)
- **MongoDB + Beanie ODM** (Async document database)
- **librosa** (Audio analysis for auto-generating tile charts from beat/onset detection)
- **JWT + bcrypt** (Stateless authentication and secure password hashing)
- **WebSockets** (FastAPI native — real-time duel room management)

**Frontend:**
- **React** (Component-based UI)
- **HTML5 Canvas** (Game rendering engine via `requestAnimationFrame`)
- **Web Audio API** (Precise audio playback for rhythm game synchronization)
- **Framer Motion** (Animations and micro-interactions)
- **Vanilla CSS** (Custom design system with CSS variables — no utility frameworks)

## Quick Start Guide

### Prerequisites
- Python 3.9+
- Node.js & yarn
- MongoDB (local or cloud instance)

### Installation Steps

1. **Clone the repository**

2. **Set up virtual environment (Backend)**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Linux: source venv/bin/activate
```

3. **Install backend dependencies**
```bash
pip install -r requirements.txt
```

4. **Environment Variables (Backend)**

Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=mongodb://localhost:27017/resonance
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
AUDIO_STORAGE_PATH=./storage
ALLOWED_ORIGINS=http://localhost:3000
MAX_UPLOAD_MB=50
```

5. **Run the backend server**
```bash
uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`  
API docs available at: `http://localhost:8000/docs`

6. **Open a new terminal and install frontend dependencies**
```bash
cd frontend
yarn install
```

7. **Environment Variables (Frontend)**

Create a `.env` file in the `frontend/` directory:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

8. **Start the frontend application**
```bash
yarn start
```

Frontend runs at: `http://localhost:3000`

## API Endpoints

**Authentication:**
- `POST /auth/register` — Create a new user account
- `POST /auth/login` — Login and receive access + refresh tokens
- `POST /auth/refresh` — Refresh an expired access token

**Music:**
- `GET /music/songs` — Browse and list all songs
- `GET /music/songs/{id}` — Fetch a specific song's details
- `POST /music/upload` — Upload a new song (admin only; auto-generates charts)
- `GET /music/search?q=` — Search songs, artists, albums, playlists

**Game:**
- `GET /game/chart/{song_id}/{difficulty}` — Fetch generated tile chart for a song
- `POST /game/score` — Submit a ranked score to the leaderboard
- `GET /game/leaderboard/{song_id}/{difficulty}` — Get per-song leaderboard

**Social:**
- `GET /social/friends` — List friends
- `POST /social/friends/request/{user_id}` — Send a friend request
- `POST /social/duels/create` — Create a new duel match
- `WebSocket /ws/game` — Real-time duel room WebSocket connection

## Architecture

```
resonance/
├── backend/
│   ├── main.py               App entry point, CORS, router mounts
│   ├── models.py             Beanie documents (User, Song, DuelMatch, etc.)
│   ├── schemas.py            Pydantic request/response schemas
│   ├── auth.py               JWT authentication routes and utilities
│   ├── routes_music.py       Music streaming, search, upload endpoints
│   ├── routes_social.py      Friends, activity feed, notifications, sharing
│   ├── routes_game.py        Chart fetch, score submission, leaderboard
│   ├── chart_generator.py    Audio analysis → tile chart generation (librosa)
│   ├── websocket_manager.py  Real-time duel WebSocket room manager
│   └── game_logic.py         Scoring algorithms, difficulty, duel state
│
└── frontend/
    └── src/
        ├── api/              Axios HTTP client + WebSocket wrapper
        ├── context/          AuthContext, PlayerContext, SocketContext
        ├── hooks/            useGameEngine (canvas loop), usePlayer
        ├── components/       Layout, Music, Game, Social, Common UI
        └── pages/            All app screens (Home, Game, Duel, Social, etc.)
```

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

© 2026 Eswar Vutukuri

## Acknowledgements

Thanks to **MongoDB** for powering the database layer, **FastAPI** and the broader Python async ecosystem for making the backend performant and developer-friendly, **librosa** for enabling automatic tile chart generation directly from raw audio, and the creators of **React** and **Framer Motion** for the tools that made building a polished, animated frontend possible. Special thanks to the Magic Tiles 3 game for the inspiration behind the rhythm game mechanics.
