from datetime import datetime
from typing import List, Optional, Any
from enum import Enum
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

class FriendshipStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    blocked = "blocked"

class ItemType(str, Enum):
    song = "song"
    playlist = "playlist"

class GameMode(str, Enum):
    practice = "practice"
    ranked = "ranked"
    duel = "duel"

class DuelMode(str, Enum):
    standard = "standard"
    infinite = "infinite"

class Difficulty(str, Enum):
    easy = "easy"
    normal = "normal"
    hard = "hard"
    insane = "insane"

class User(Document):
    username: str
    email: str
    password_hash: str
    avatar_url: Optional[str] = None
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

class Artist(Document):
    name: str
    bio: Optional[str] = None
    image_url: Optional[str] = None

    class Settings:
        name = "artists"

class Album(Document):
    title: str
    artist_id: PydanticObjectId
    cover_url: Optional[str] = None
    release_date: Optional[datetime] = None

    class Settings:
        name = "albums"

class Song(Document):
    title: str
    artist_id: PydanticObjectId
    album_id: Optional[PydanticObjectId] = None
    duration_sec: Optional[float] = None
    audio_url: str
    bpm: Optional[float] = None
    cover_url: Optional[str] = None
    uploaded_by: Optional[PydanticObjectId] = None
    play_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "songs"

class Playlist(Document):
    owner_id: PydanticObjectId
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "playlists"

class PlaylistSong(Document):
    playlist_id: PydanticObjectId
    song_id: PydanticObjectId
    position: int = 0
    added_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "playlist_songs"

class LikedSong(Document):
    user_id: PydanticObjectId
    song_id: PydanticObjectId
    liked_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "liked_songs"

class FollowedArtist(Document):
    user_id: PydanticObjectId
    artist_id: PydanticObjectId
    followed_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "followed_artists"

class Friendship(Document):
    user_id: PydanticObjectId
    friend_id: PydanticObjectId
    status: FriendshipStatus = FriendshipStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "friendships"

class SharedItem(Document):
    from_user_id: PydanticObjectId
    to_user_id: PydanticObjectId
    item_type: ItemType
    item_id: PydanticObjectId
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    seen: bool = False

    class Settings:
        name = "shared_items"

class TileChart(Document):
    song_id: PydanticObjectId
    difficulty: Difficulty
    chart_data: List[Any]
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tile_charts"

class GameSession(Document):
    user_id: PydanticObjectId
    song_id: PydanticObjectId
    difficulty: Difficulty
    mode: GameMode
    score: int = 0
    accuracy: float = 0.0
    max_combo: int = 0
    perfect_count: int = 0
    good_count: int = 0
    miss_count: int = 0
    result: Optional[str] = None
    played_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "game_sessions"

class DuelMatch(Document):
    song_id: PydanticObjectId
    difficulty: Difficulty
    mode: DuelMode = DuelMode.standard
    player1_id: PydanticObjectId
    player2_id: Optional[PydanticObjectId] = None
    winner_id: Optional[PydanticObjectId] = None
    loops_survived: int = 0
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Settings:
        name = "duel_matches"

class LeaderboardEntry(Document):
    user_id: PydanticObjectId
    song_id: PydanticObjectId
    difficulty: Difficulty
    best_score: int = 0
    best_accuracy: float = 0.0
    achieved_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "leaderboard_entries"

class Comment(Document):
    song_id: PydanticObjectId
    user_id: PydanticObjectId
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "comments"

__models__ = [
    User, Artist, Album, Song, Playlist, PlaylistSong, LikedSong, FollowedArtist,
    Friendship, SharedItem, TileChart, GameSession, DuelMatch, LeaderboardEntry,
    Comment,
]
