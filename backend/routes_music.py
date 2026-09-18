import os
import uuid
import logging
from typing import Optional, List
from fastapi import (
    APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
)
from fastapi.responses import FileResponse
from beanie.operators import RegEx, In, Or

from auth import get_current_user
from config import settings
from models import (
    User, Song, Artist, Album, Playlist, PlaylistSong, LikedSong, FollowedArtist, TileChart, GameSession, Difficulty,
    Comment,
)
import schemas
from chart_generator import generate_all_difficulties
from beanie import PydanticObjectId

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/music", tags=["music"])

ALLOWED_AUDIO_EXTS = {".mp3", ".ogg", ".wav", ".flac", ".m4a"}
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def _save_file(upload: UploadFile, folder: str, allowed_exts: set) -> str:
    ext = os.path.splitext(upload.filename or "")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    storage = os.path.abspath(settings.AUDIO_STORAGE_PATH)
    dest_folder = os.path.join(storage, folder)
    os.makedirs(dest_folder, exist_ok=True)

    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(dest_folder, filename)

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    total = 0
    with open(dest, "wb") as f:
        while chunk := upload.file.read(1024 * 256):
            total += len(chunk)
            if total > max_bytes:
                os.remove(dest)
                raise HTTPException(413, f"File too large (max {settings.MAX_UPLOAD_MB} MB)")
            f.write(chunk)

    return f"/storage/{folder}/{filename}"


@router.get("/stream/{file_path:path}")
def stream_audio(file_path: str):
    full = os.path.join(os.path.abspath(settings.AUDIO_STORAGE_PATH), file_path)
    if not os.path.exists(full):
        raise HTTPException(404, "File not found")
    return FileResponse(full, media_type="audio/mpeg")


@router.get("/search", response_model=schemas.SearchResults)
async def search(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
):
    songs = await Song.find(RegEx(Song.title, q, "i")).limit(20).to_list()
    artists = await Artist.find(RegEx(Artist.name, q, "i")).limit(10).to_list()
    albums = await Album.find(RegEx(Album.title, q, "i")).limit(10).to_list()
    playlists = await Playlist.find(
        RegEx(Playlist.name, q, "i"),
        Playlist.is_public == True
    ).limit(10).to_list()

    return schemas.SearchResults(songs=songs, artists=artists, albums=albums, playlists=playlists)


@router.get("/songs", response_model=List[schemas.SongOut])
async def list_songs(
    skip: int = 0, limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    return await Song.find().sort("-created_at").skip(skip).limit(limit).to_list()


@router.get("/songs/trending", response_model=List[schemas.SongOut])
async def trending_songs(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
):
    return await Song.find().sort("-play_count").limit(limit).to_list()


@router.get("/songs/top-tracks", response_model=List[schemas.SongOut])
async def top_tracks(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
):
    return await Song.find().sort("-play_count").limit(limit).to_list()


@router.get("/songs/{song_id}", response_model=schemas.SongOut)
async def get_song(song_id: str, current_user: User = Depends(get_current_user)):
    song = await Song.get(PydanticObjectId(song_id))
    if not song:
        raise HTTPException(404, "Song not found")
    song.play_count = (song.play_count or 0) + 1
    await song.save()
    return song


@router.post("/songs/{song_id}/like", status_code=200)
async def like_song(song_id: str, current_user: User = Depends(get_current_user)):
    s_id = PydanticObjectId(song_id)
    existing = await LikedSong.find_one(LikedSong.user_id == current_user.id, LikedSong.song_id == s_id)
    if existing:
        await existing.delete()
        return {"liked": False}
    await LikedSong(user_id=current_user.id, song_id=s_id).insert()
    return {"liked": True}


@router.get("/songs/{song_id}/liked", status_code=200)
async def is_liked(song_id: str, current_user: User = Depends(get_current_user)):
    exists = await LikedSong.find_one(
        LikedSong.user_id == current_user.id, LikedSong.song_id == PydanticObjectId(song_id)
    )
    return {"liked": bool(exists)}


@router.get("/songs/{song_id}/comments", response_model=List[schemas.CommentOut])
async def get_song_comments(song_id: str, current_user: User = Depends(get_current_user)):
    s_id = PydanticObjectId(song_id)
    comments = await Comment.find(Comment.song_id == s_id).sort("-created_at").limit(50).to_list()
    results = []
    for c in comments:
        u = await User.get(c.user_id)
        d = c.model_dump()
        d["user"] = schemas.UserPublic.model_validate(u, from_attributes=True) if u else None
        results.append(d)
    return results


@router.post("/songs/{song_id}/comments", response_model=schemas.CommentOut, status_code=201)
async def post_song_comment(
    song_id: str,
    payload: schemas.CommentCreate,
    current_user: User = Depends(get_current_user),
):
    if not payload.text or not payload.text.strip():
        raise HTTPException(400, "Comment text required")
    s_id = PydanticObjectId(song_id)
    song = await Song.get(s_id)
    if not song:
        raise HTTPException(404, "Song not found")
    comment = Comment(song_id=s_id, user_id=current_user.id, text=payload.text.strip())
    await comment.insert()
    d = comment.model_dump()
    d["user"] = schemas.UserPublic.model_validate(current_user, from_attributes=True)
    return d


@router.get("/library/liked", response_model=List[schemas.SongOut])
async def get_liked_songs(current_user: User = Depends(get_current_user)):
    entries = await LikedSong.find(LikedSong.user_id == current_user.id).sort("-liked_at").to_list()
    if not entries:
        return []
    song_ids = [e.song_id for e in entries]
    songs = await Song.find(In(Song.id, song_ids)).to_list()
    song_map = {str(s.id): s for s in songs}
    return [song_map[str(sid)] for sid in song_ids if str(sid) in song_map]


@router.get("/artists", response_model=List[schemas.ArtistOut])
async def list_artists(skip: int = 0, limit: int = 50, current_user: User = Depends(get_current_user)):
    return await Artist.find().skip(skip).limit(limit).to_list()


@router.get("/artists/{artist_id}", response_model=schemas.ArtistOut)
async def get_artist(artist_id: str, current_user: User = Depends(get_current_user)):
    artist = await Artist.get(PydanticObjectId(artist_id))
    if not artist:
        raise HTTPException(404, "Artist not found")
    return artist


@router.get("/artists/{artist_id}/songs", response_model=List[schemas.SongOut])
async def artist_songs(artist_id: str, current_user: User = Depends(get_current_user)):
    return await Song.find(Song.artist_id == PydanticObjectId(artist_id)).to_list()


@router.get("/artists/{artist_id}/albums", response_model=List[schemas.AlbumOut])
async def artist_albums(artist_id: str, current_user: User = Depends(get_current_user)):
    return await Album.find(Album.artist_id == PydanticObjectId(artist_id)).to_list()


@router.post("/artists/{artist_id}/follow", status_code=200)
async def follow_artist(artist_id: str, current_user: User = Depends(get_current_user)):
    a_id = PydanticObjectId(artist_id)
    existing = await FollowedArtist.find_one(
        FollowedArtist.user_id == current_user.id, FollowedArtist.artist_id == a_id
    )
    if existing:
        await existing.delete()
        return {"following": False}
    await FollowedArtist(user_id=current_user.id, artist_id=a_id).insert()
    return {"following": True}


@router.get("/library/artists", response_model=List[schemas.ArtistOut])
async def followed_artists(current_user: User = Depends(get_current_user)):
    entries = await FollowedArtist.find(FollowedArtist.user_id == current_user.id).to_list()
    if not entries:
        return []
    artist_ids = [e.artist_id for e in entries]
    return await Artist.find(In(Artist.id, artist_ids)).to_list()


@router.get("/albums", response_model=List[schemas.AlbumOut])
async def list_albums(
    skip: int = 0, limit: int = 20,
    current_user: User = Depends(get_current_user),
):
    return await Album.find().skip(skip).limit(limit).to_list()


@router.get("/albums/{album_id}", response_model=schemas.AlbumOut)
async def get_album(album_id: str, current_user: User = Depends(get_current_user)):
    album = await Album.get(PydanticObjectId(album_id))
    if not album:
        raise HTTPException(404, "Album not found")
    return album


@router.get("/albums/{album_id}/songs", response_model=List[schemas.SongOut])
async def album_songs(album_id: str, current_user: User = Depends(get_current_user)):
    return await Song.find(Song.album_id == PydanticObjectId(album_id)).to_list()


@router.get("/playlists", response_model=List[schemas.PlaylistSummary])
async def list_playlists(current_user: User = Depends(get_current_user)):
    return await Playlist.find(
        Or(Playlist.owner_id == current_user.id, Playlist.is_public == True)
    ).sort("-created_at").to_list()


@router.get("/playlists/mine", response_model=List[schemas.PlaylistSummary])
async def my_playlists(current_user: User = Depends(get_current_user)):
    return await Playlist.find(Playlist.owner_id == current_user.id).to_list()


@router.post("/playlists", response_model=schemas.PlaylistOut, status_code=201)
async def create_playlist(payload: schemas.PlaylistCreate, current_user: User = Depends(get_current_user)):
    pl = Playlist(owner_id=current_user.id, **payload.model_dump())
    await pl.insert()
    return pl


@router.get("/playlists/{playlist_id}", response_model=schemas.PlaylistOut)
async def get_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    pl = await Playlist.get(PydanticObjectId(playlist_id))
    if not pl:
        raise HTTPException(404, "Playlist not found")
    if not pl.is_public and pl.owner_id != current_user.id:
        raise HTTPException(403, "Private playlist")
    entries = await PlaylistSong.find(PlaylistSong.playlist_id == pl.id).sort("position").to_list()
    song_ids = [e.song_id for e in entries]
    songs = await Song.find(In(Song.id, song_ids)).to_list()
    song_map = {str(s.id): s for s in songs}
    
    pl_dict = pl.model_dump()
    pl_dict['songs'] = []
    for e in entries:
        if str(e.song_id) in song_map:
            s_dict = e.model_dump()
            s_dict['song'] = song_map[str(e.song_id)]
            pl_dict['songs'].append(s_dict)

    return pl_dict


@router.put("/playlists/{playlist_id}", response_model=schemas.PlaylistOut)
async def update_playlist(playlist_id: str, payload: schemas.PlaylistUpdate, current_user: User = Depends(get_current_user)):
    pl = await Playlist.get(PydanticObjectId(playlist_id))
    if not pl or pl.owner_id != current_user.id:
        raise HTTPException(404, "Playlist not found or not yours")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(pl, k, v)
    await pl.save()
    return pl


@router.delete("/playlists/{playlist_id}", status_code=204)
async def delete_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    pl = await Playlist.get(PydanticObjectId(playlist_id))
    if not pl or pl.owner_id != current_user.id:
        raise HTTPException(404, "Playlist not found or not yours")
    await pl.delete()


@router.post("/playlists/{playlist_id}/songs", status_code=201)
async def add_song_to_playlist(playlist_id: str, payload: schemas.AddSongToPlaylist, current_user: User = Depends(get_current_user)):
    p_id = PydanticObjectId(playlist_id)
    pl = await Playlist.get(p_id)
    if not pl or pl.owner_id != current_user.id:
        raise HTTPException(404, "Playlist not found or not yours")
    song = await Song.get(payload.song_id)
    if not song:
        raise HTTPException(404, "Song not found")

    existing = await PlaylistSong.find_one(PlaylistSong.playlist_id == p_id, PlaylistSong.song_id == payload.song_id)
    if existing:
        return {"message": "Already in playlist"}

    count = await PlaylistSong.find(PlaylistSong.playlist_id == p_id).count()
    position = payload.position if payload.position is not None else count
    await PlaylistSong(playlist_id=p_id, song_id=payload.song_id, position=position).insert()
    return {"message": "Added"}


@router.delete("/playlists/{playlist_id}/songs/{song_id}", status_code=204)
async def remove_from_playlist(playlist_id: str, song_id: str, current_user: User = Depends(get_current_user)):
    p_id = PydanticObjectId(playlist_id)
    s_id = PydanticObjectId(song_id)
    pl = await Playlist.get(p_id)
    if not pl or pl.owner_id != current_user.id:
        raise HTTPException(404)
    entry = await PlaylistSong.find_one(PlaylistSong.playlist_id == p_id, PlaylistSong.song_id == s_id)
    if entry:
        await entry.delete()


@router.put("/playlists/{playlist_id}/reorder", status_code=200)
async def reorder_playlist(playlist_id: str, payload: schemas.ReorderPlaylist, current_user: User = Depends(get_current_user)):
    p_id = PydanticObjectId(playlist_id)
    pl = await Playlist.get(p_id)
    if not pl or pl.owner_id != current_user.id:
        raise HTTPException(404)
    
    for idx, song_id in enumerate(payload.song_ids):
        entry = await PlaylistSong.find_one(PlaylistSong.playlist_id == p_id, PlaylistSong.song_id == song_id)
        if entry:
            entry.position = idx
            await entry.save()
    return {"message": "Reordered"}


@router.post("/playlists/{playlist_id}/cover")
async def upload_playlist_cover(
    playlist_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    pl = await Playlist.get(PydanticObjectId(playlist_id))
    if not pl or pl.owner_id != current_user.id:
        raise HTTPException(404)
    url = _save_file(file, "covers", ALLOWED_IMAGE_EXTS)
    pl.cover_url = url
    await pl.save()
    return {"cover_url": url}


@router.post("/upload", response_model=schemas.SongOut, status_code=201)
async def upload_song(
    title: str = Form(...),
    artist_name: str = Form(...),
    album_title: Optional[str] = Form(None),
    audio: UploadFile = File(...),
    cover: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(403, "Only admins can upload songs")
        
    audio_url = _save_file(audio, "audio", ALLOWED_AUDIO_EXTS)
    cover_url = None
    if cover and cover.filename:
        cover_url = _save_file(cover, "covers", ALLOWED_IMAGE_EXTS)
    artist = await Artist.find_one(RegEx(Artist.name, f"^{artist_name}$", "i"))
    if not artist:
        artist = Artist(name=artist_name)
        await artist.insert()

    album = None
    if album_title:
        album = await Album.find_one(
            RegEx(Album.title, f"^{album_title}$", "i"),
            Album.artist_id == artist.id
        )
        if not album:
            album = Album(title=album_title, artist_id=artist.id, cover_url=cover_url)
            await album.insert()

    audio_abs = os.path.join(os.path.abspath(settings.AUDIO_STORAGE_PATH), audio_url.lstrip("/storage/"))
    duration_sec = None
    bpm = 120.0
    try:
        import librosa
        y, sr = librosa.load(audio_abs, sr=22050, mono=True, duration=30)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo)
        import soundfile as sf
        info = sf.info(audio_abs)
        duration_sec = info.duration
    except Exception as e:
        logger.warning("Could not extract audio metadata: %s", e)

    song = Song(
        title=title,
        artist_id=artist.id,
        album_id=album.id if album else None,
        audio_url=audio_url,
        cover_url=cover_url or (album.cover_url if album else None),
        bpm=bpm,
        duration_sec=duration_sec,
        uploaded_by=current_user.id,
    )
    await song.insert()
    try:
        charts = generate_all_difficulties(audio_abs, duration_sec or 180, bpm)
        for diff, chart_data in charts.items():
            diff_enum = Difficulty(diff)
            await TileChart(song_id=song.id, difficulty=diff_enum, chart_data=chart_data).insert()
    except Exception as e:
        logger.error("Chart generation error for song %s: %s", song.id, e)

    return song


@router.post("/songs/{song_id}/rechart")
async def rechart_song(song_id: str, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(403, "Only admins can regenerate charts")
    song = await Song.get(PydanticObjectId(song_id))
    if not song:
        raise HTTPException(404, "Song not found")
    audio_abs = os.path.join(os.path.abspath(settings.AUDIO_STORAGE_PATH), song.audio_url.lstrip("/storage/"))
    if not os.path.exists(audio_abs):
        raise HTTPException(404, "Audio file missing from storage")
    try:
        charts = generate_all_difficulties(audio_abs, song.duration_sec or 180, song.bpm or 120.0)
        old = await TileChart.find(TileChart.song_id == song.id).to_list()
        for c in old:
            await c.delete()
        counts = {}
        for diff, chart_data in charts.items():
            diff_enum = Difficulty(diff)
            await TileChart(song_id=song.id, difficulty=diff_enum, chart_data=chart_data).insert()
            counts[diff_enum.value] = len(chart_data)
        return {"message": "Charts regenerated (MT3 beat-locked)", "counts": counts}
    except Exception as e:
        logger.error("Rechart error for song %s: %s", song.id, e)
        raise HTTPException(500, f"Regeneration failed: {e}")


@router.get("/home/recent", response_model=List[schemas.SongOut])
async def recently_played(current_user: User = Depends(get_current_user)):
    sessions = await GameSession.find(GameSession.user_id == current_user.id).sort("-played_at").limit(20).to_list()
    if not sessions:
        return []
    seen_ids = []
    results = []
    
    song_ids = [s.song_id for s in sessions]
    if not song_ids:
        return []
    songs = await Song.find(In(Song.id, song_ids)).to_list()
    song_map = {str(s.id): s for s in songs}

    for s_id in song_ids:
        str_id = str(s_id)
        if str_id not in seen_ids and str_id in song_map:
            seen_ids.append(str_id)
            results.append(song_map[str_id])
    return results


@router.get("/home/featured", response_model=List[schemas.PlaylistSummary])
async def featured_playlists(current_user: User = Depends(get_current_user)):
    return await Playlist.find(Playlist.is_public == True).sort("-created_at").limit(10).to_list()


@router.get("/users/{user_id}", response_model=schemas.UserOut)
async def get_user_profile(user_id: str, current_user: User = Depends(get_current_user)):
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("/users/{user_id}/playlists", response_model=List[schemas.PlaylistSummary])
async def user_playlists(user_id: str, current_user: User = Depends(get_current_user)):
    u_id = PydanticObjectId(user_id)
    if u_id == current_user.id:
        return await Playlist.find(Playlist.owner_id == u_id).to_list()
    else:
        return await Playlist.find(Playlist.owner_id == u_id, Playlist.is_public == True).to_list()


@router.post("/users/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    url = _save_file(file, "avatars", ALLOWED_IMAGE_EXTS)
    current_user.avatar_url = url
    await current_user.save()
    return {"avatar_url": url}
