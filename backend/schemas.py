from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr
from beanie import PydanticObjectId

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class UserOut(BaseModel):
    id: PydanticObjectId
    username: str
    email: str
    avatar_url: Optional[str] = None
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    id: PydanticObjectId
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class ArtistOut(BaseModel):
    id: PydanticObjectId
    name: str
    bio: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class ArtistCreate(BaseModel):
    name: str
    bio: Optional[str] = None


class AlbumOut(BaseModel):
    id: PydanticObjectId
    title: str
    artist_id: PydanticObjectId
    cover_url: Optional[str] = None
    release_date: Optional[datetime] = None
    artist: Optional[ArtistOut] = None

    class Config:
        from_attributes = True

class SongOut(BaseModel):
    id: PydanticObjectId
    title: str
    artist_id: PydanticObjectId
    album_id: Optional[PydanticObjectId] = None
    duration_sec: Optional[float] = None
    audio_url: str
    bpm: Optional[float] = None
    cover_url: Optional[str] = None
    play_count: int = 0
    created_at: datetime
    artist: Optional[ArtistOut] = None
    album: Optional[AlbumOut] = None

    class Config:
        from_attributes = True

class PlaylistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class PlaylistSongOut(BaseModel):
    id: PydanticObjectId
    position: int
    added_at: datetime
    song: SongOut

    class Config:
        from_attributes = True

class PlaylistOut(BaseModel):
    id: PydanticObjectId
    owner_id: PydanticObjectId
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: bool
    created_at: datetime
    owner: Optional[UserPublic] = None
    songs: List[PlaylistSongOut] = []

    class Config:
        from_attributes = True

class PlaylistSummary(BaseModel):
    id: PydanticObjectId
    owner_id: PydanticObjectId
    name: str
    cover_url: Optional[str] = None
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AddSongToPlaylist(BaseModel):
    song_id: PydanticObjectId
    position: Optional[int] = None

class ReorderPlaylist(BaseModel):
    song_ids: List[PydanticObjectId]

class FriendshipOut(BaseModel):
    id: PydanticObjectId
    user_id: PydanticObjectId
    friend_id: PydanticObjectId
    status: str
    created_at: datetime
    user: Optional[UserPublic] = None
    friend: Optional[UserPublic] = None

    class Config:
        from_attributes = True

class FriendRequest(BaseModel):
    user_id: PydanticObjectId

class ShareItemRequest(BaseModel):
    to_user_id: PydanticObjectId
    item_type: str
    item_id: PydanticObjectId
    message: Optional[str] = None

class SharedItemOut(BaseModel):
    id: PydanticObjectId
    from_user_id: PydanticObjectId
    to_user_id: PydanticObjectId
    item_type: str
    item_id: PydanticObjectId
    message: Optional[str] = None
    created_at: datetime
    seen: bool
    from_user: Optional[UserPublic] = None

    class Config:
        from_attributes = True

class ActivityItem(BaseModel):
    user: UserPublic
    song: SongOut
    played_at: datetime

class TileChartOut(BaseModel):
    id: PydanticObjectId
    song_id: PydanticObjectId
    difficulty: str
    chart_data: List[Any]
    generated_at: datetime

    class Config:
        from_attributes = True

class GameSessionSubmit(BaseModel):
    song_id: PydanticObjectId
    difficulty: str
    mode: str
    score: int
    accuracy: float
    max_combo: int
    perfect_count: int
    good_count: int
    miss_count: int
    result: str

class GameSessionOut(BaseModel):
    id: PydanticObjectId
    user_id: PydanticObjectId
    song_id: PydanticObjectId
    difficulty: str
    mode: str
    score: int
    accuracy: float
    max_combo: int
    result: str
    played_at: datetime

    class Config:
        from_attributes = True

class LeaderboardEntryOut(BaseModel):
    rank: int
    user: UserPublic
    best_score: int
    best_accuracy: float
    achieved_at: datetime

class DuelCreateRequest(BaseModel):
    song_id: PydanticObjectId
    difficulty: str
    mode: str = "standard"
    opponent_id: PydanticObjectId

class DuelMatchOut(BaseModel):
    id: PydanticObjectId
    song_id: PydanticObjectId
    difficulty: str
    mode: str
    player1_id: PydanticObjectId
    player2_id: Optional[PydanticObjectId] = None
    winner_id: Optional[PydanticObjectId] = None
    loops_survived: int = 0
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SearchResults(BaseModel):
    songs: List[SongOut] = []
    artists: List[ArtistOut] = []
    albums: List[AlbumOut] = []
    playlists: List[PlaylistSummary] = []

class CommentCreate(BaseModel):
    text: str

class CommentOut(BaseModel):
    id: PydanticObjectId
    song_id: PydanticObjectId
    user_id: PydanticObjectId
    text: str
    created_at: datetime
    user: Optional[UserPublic] = None

    class Config:
        from_attributes = True
