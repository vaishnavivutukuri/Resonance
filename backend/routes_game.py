from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from beanie import PydanticObjectId
from beanie.operators import In

from auth import get_current_user, decode_token
import models
import schemas
from game_logic import calculate_score, DIFFICULTY_CONFIG
from beanie.operators import Or
from websocket_manager import (
    handle_duel_websocket, create_duel_room, get_duel_room, remove_duel_room
)

router = APIRouter(prefix="/game", tags=["game"])

@router.get("/chart/{song_id}/{difficulty}", response_model=schemas.TileChartOut)
async def get_chart(
    song_id: str,
    difficulty: str,
    current_user: models.User = Depends(get_current_user),
):
    try:
        diff_enum = models.Difficulty(difficulty)
    except ValueError:
        raise HTTPException(400, f"Invalid difficulty: {difficulty}")
    chart = await models.TileChart.find_one(
        models.TileChart.song_id == PydanticObjectId(song_id),
        models.TileChart.difficulty == diff_enum,
    )
    if not chart:
        song = await models.Song.get(PydanticObjectId(song_id))
        if not song:
            raise HTTPException(404, "Song not found")
        raise HTTPException(404, "Chart not yet generated — upload may still be processing")
    return chart


@router.get("/chart/{song_id}/{difficulty}/config")
def get_difficulty_config(
    song_id: str,
    difficulty: str,
    current_user: models.User = Depends(get_current_user),
):
    try:
        diff_enum = models.Difficulty(difficulty)
    except ValueError:
        raise HTTPException(400, "Invalid difficulty")
    return DIFFICULTY_CONFIG[diff_enum]


@router.post("/session", response_model=schemas.GameSessionOut, status_code=201)
async def submit_session(
    payload: schemas.GameSessionSubmit,
    current_user: models.User = Depends(get_current_user),
):
    try:
        diff_enum = models.Difficulty(payload.difficulty)
        mode_enum = models.GameMode(payload.mode)
    except ValueError as e:
        raise HTTPException(400, str(e))
    final_score, accuracy, grade = calculate_score(
        payload.perfect_count, payload.good_count, payload.miss_count, diff_enum
    )
    session = models.GameSession(
        user_id=current_user.id,
        song_id=payload.song_id,
        difficulty=diff_enum,
        mode=mode_enum,
        score=final_score,
        accuracy=accuracy,
        max_combo=payload.max_combo,
        perfect_count=payload.perfect_count,
        good_count=payload.good_count,
        miss_count=payload.miss_count,
        result=payload.result,
    )
    await session.insert()
    if mode_enum == models.GameMode.ranked:
        existing = await models.LeaderboardEntry.find_one(
            models.LeaderboardEntry.user_id == current_user.id,
            models.LeaderboardEntry.song_id == payload.song_id,
            models.LeaderboardEntry.difficulty == diff_enum
        )
        if not existing:
            await models.LeaderboardEntry(
                user_id=current_user.id,
                song_id=payload.song_id,
                difficulty=diff_enum,
                best_score=final_score,
                best_accuracy=accuracy,
            ).insert()
        elif final_score > existing.best_score:
            existing.best_score = final_score
            existing.best_accuracy = accuracy
            existing.achieved_at = datetime.utcnow()
            await existing.save()
    return session


@router.get("/leaderboard/{song_id}/{difficulty}", response_model=List[schemas.LeaderboardEntryOut])
async def song_leaderboard(
    song_id: str,
    difficulty: str,
    limit: int = 50,
    friends_only: bool = False,
    current_user: models.User = Depends(get_current_user),
):
    try:
        diff_enum = models.Difficulty(difficulty)
    except ValueError:
        raise HTTPException(400, "Invalid difficulty")
    s_id = PydanticObjectId(song_id)
    if friends_only:
        friendships = await models.Friendship.find(
            Or(
                models.Friendship.user_id == current_user.id,
                models.Friendship.friend_id == current_user.id,
            ),
            models.Friendship.status == models.FriendshipStatus.accepted
        ).to_list()
        friend_ids = {current_user.id}
        for fr in friendships:
            other = fr.friend_id if fr.user_id == current_user.id else fr.user_id
            friend_ids.add(other)
        entries = await models.LeaderboardEntry.find(
            models.LeaderboardEntry.song_id == s_id,
            models.LeaderboardEntry.difficulty == diff_enum,
            In(models.LeaderboardEntry.user_id, list(friend_ids))
        ).sort("-best_score").limit(limit).to_list()
    else:
        entries = await models.LeaderboardEntry.find(
            models.LeaderboardEntry.song_id == s_id,
            models.LeaderboardEntry.difficulty == diff_enum
        ).sort("-best_score").limit(limit).to_list()
    u_ids = list(set([e.user_id for e in entries]))
    users = await models.User.find(In(models.User.id, u_ids)).to_list()
    u_map = {u.id: u for u in users}
    results = []
    for idx, e in enumerate(entries):
        u = u_map.get(e.user_id)
        if u:
            results.append(
                schemas.LeaderboardEntryOut(
                    rank=idx + 1,
                    user=schemas.UserPublic.model_validate(u, from_attributes=True),
                    best_score=e.best_score,
                    best_accuracy=e.best_accuracy,
                    achieved_at=e.achieved_at,
                )
            )
    return results


@router.get("/leaderboard/global", response_model=List[schemas.LeaderboardEntryOut])
async def global_leaderboard(
    limit: int = 50,
    current_user: models.User = Depends(get_current_user),
):
    pipeline = [
        {
            "$group": {
                "_id": "$user_id",
                "total_score": {"$sum": "$best_score"},
                "avg_accuracy": {"$avg": "$best_accuracy"}
            }
        },
        {"$sort": {"total_score": -1}},
        {"$limit": limit}
    ]
    aggr = await models.LeaderboardEntry.aggregate(pipeline).to_list()
    results = []
    for idx, row in enumerate(aggr):
        user = await models.User.get(row["_id"])
        if user:
            results.append(schemas.LeaderboardEntryOut(
                rank=idx + 1,
                user=schemas.UserPublic.model_validate(user, from_attributes=True),
                best_score=int(row["total_score"]),
                best_accuracy=round(float(row["avg_accuracy"]), 4),
                achieved_at=datetime.utcnow(),
            ))
    return results


@router.post("/duel/create", response_model=schemas.DuelMatchOut, status_code=201)
async def create_duel(
    payload: schemas.DuelCreateRequest,
    current_user: models.User = Depends(get_current_user),
):
    try:
        diff_enum = models.Difficulty(payload.difficulty)
        mode_enum = models.DuelMode(payload.mode)
    except ValueError as e:
        raise HTTPException(400, str(e))
    opponent = await models.User.get(payload.opponent_id)
    if not opponent:
        raise HTTPException(404, "Opponent not found")
    song = await models.Song.get(payload.song_id)
    if not song:
        raise HTTPException(404, "Song not found")
    match = models.DuelMatch(
        song_id=payload.song_id,
        difficulty=diff_enum,
        mode=mode_enum,
        player1_id=current_user.id,
        player2_id=payload.opponent_id,
    )
    await match.insert()
    room_id = f"duel_{match.id}"
    create_duel_room(room_id, str(current_user.id), str(payload.opponent_id), diff_enum, payload.mode)
    notification = models.SharedItem(
        from_user_id=current_user.id,
        to_user_id=payload.opponent_id,
        item_type=models.ItemType.song,
        item_id=payload.song_id,
        message=f"duel_invite:{match.id}",
    )
    await notification.insert()
    return match


@router.get("/duel/{match_id}", response_model=schemas.DuelMatchOut)
async def get_duel(match_id: str, current_user: models.User = Depends(get_current_user)):
    match = await models.DuelMatch.get(PydanticObjectId(match_id))
    if not match:
        raise HTTPException(404, "Match not found")
    room_id = f"duel_{match.id}"
    if get_duel_room(room_id) is None:
        try:
            create_duel_room(
                room_id,
                str(match.player1_id),
                str(match.player2_id) if match.player2_id else str(match.player1_id),
                match.difficulty,
                match.mode.value if hasattr(match.mode, "value") else str(match.mode),
            )
        except Exception:
            pass
    return match


@router.websocket("/ws/duel/{room_id}")
async def duel_websocket(
    websocket: WebSocket,
    room_id: str,
    token: Optional[str] = None,
):
    if not token:
        await websocket.close(code=4001)
        return
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001)
        return
    user_id_str = str(payload["sub"])

    async def on_match_end(winner_id: Optional[str], rid: str, loops: int):
        match_id_str = rid.replace("duel_", "")
        try:
            mid = PydanticObjectId(match_id_str)
            match = await models.DuelMatch.get(mid)
            if match:
                if winner_id:
                    match.winner_id = PydanticObjectId(winner_id)
                match.loops_survived = loops
                match.ended_at = datetime.utcnow()
                await match.save()
        except Exception:
            pass
        remove_duel_room(rid)

    await handle_duel_websocket(websocket, room_id, user_id_str, db_callback=on_match_end)
