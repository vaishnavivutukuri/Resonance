from typing import List
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId
from beanie.operators import In, RegEx, Or

from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/social", tags=["social"])


@router.get("/friends", response_model=List[schemas.FriendshipOut])
async def get_friends(current_user: models.User = Depends(get_current_user)):
    friends = await models.Friendship.find(
        Or(
            models.Friendship.user_id == current_user.id,
            models.Friendship.friend_id == current_user.id,
        ),
        models.Friendship.status == models.FriendshipStatus.accepted
    ).to_list()
    results = []
    for f in friends:
        u = await models.User.get(f.user_id)
        fr = await models.User.get(f.friend_id)
        d = f.model_dump()
        d['user'] = schemas.UserPublic.model_validate(u, from_attributes=True) if u else None
        d['friend'] = schemas.UserPublic.model_validate(fr, from_attributes=True) if fr else None
        results.append(d)
    return results


@router.get("/friends/requests", response_model=List[schemas.FriendshipOut])
async def pending_requests(current_user: models.User = Depends(get_current_user)):
    reqs = await models.Friendship.find(
        models.Friendship.friend_id == current_user.id,
        models.Friendship.status == models.FriendshipStatus.pending
    ).to_list()
    results = []
    for r in reqs:
        u = await models.User.get(r.user_id)
        d = r.model_dump()
        d['user'] = schemas.UserPublic.model_validate(u, from_attributes=True) if u else None
        results.append(d)
    return results


@router.post("/friends/request", status_code=201)
async def send_friend_request(
    payload: schemas.FriendRequest,
    current_user: models.User = Depends(get_current_user),
):
    if payload.user_id == current_user.id:
        raise HTTPException(400, "Cannot friend yourself")
    target = await models.User.get(payload.user_id)
    if not target:
        raise HTTPException(404, "User not found")
    existing = await models.Friendship.find_one(
        models.Friendship.user_id == current_user.id,
        models.Friendship.friend_id == payload.user_id,
    )
    if not existing:
        existing = await models.Friendship.find_one(
            models.Friendship.user_id == payload.user_id,
            models.Friendship.friend_id == current_user.id,
        )
    if existing:
        raise HTTPException(400, "Friendship already exists")
    await models.Friendship(
        user_id=current_user.id,
        friend_id=payload.user_id,
        status=models.FriendshipStatus.pending,
    ).insert()
    return {"message": "Friend request sent"}


@router.post("/friends/{friendship_id}/accept", status_code=200)
async def accept_friend_request(friendship_id: str, current_user: models.User = Depends(get_current_user)):
    fr = await models.Friendship.find_one(
        models.Friendship.id == PydanticObjectId(friendship_id),
        models.Friendship.friend_id == current_user.id,
        models.Friendship.status == models.FriendshipStatus.pending,
    )
    if not fr:
        raise HTTPException(404, "Friend request not found")
    fr.status = models.FriendshipStatus.accepted
    await fr.save()
    return {"message": "Friend request accepted"}


@router.post("/friends/{friendship_id}/decline", status_code=200)
async def decline_friend_request(friendship_id: str, current_user: models.User = Depends(get_current_user)):
    fr = await models.Friendship.find_one(
        models.Friendship.id == PydanticObjectId(friendship_id),
        models.Friendship.friend_id == current_user.id,
    )
    if not fr:
        raise HTTPException(404, "Not found")
    await fr.delete()
    return {"message": "Declined"}


@router.delete("/friends/{friendship_id}", status_code=204)
async def remove_friend(friendship_id: str, current_user: models.User = Depends(get_current_user)):
    f_id = PydanticObjectId(friendship_id)
    fr = await models.Friendship.get(f_id)
    if not fr or (fr.user_id != current_user.id and fr.friend_id != current_user.id):
        raise HTTPException(404, "Not found")
    await fr.delete()


@router.get("/users/search", response_model=List[schemas.UserPublic])
async def search_users(
    q: str,
    current_user: models.User = Depends(get_current_user),
):
    return await models.User.find(
        RegEx(models.User.username, q, "i"),
        models.User.id != current_user.id,
    ).limit(20).to_list()


@router.post("/share", status_code=201)
async def share_item(
    payload: schemas.ShareItemRequest,
    current_user: models.User = Depends(get_current_user),
):
    target = await models.User.get(payload.to_user_id)
    if not target:
        raise HTTPException(404, "User not found")
    await models.SharedItem(
        from_user_id=current_user.id,
        to_user_id=payload.to_user_id,
        item_type=payload.item_type,
        item_id=payload.item_id,
        message=payload.message,
    ).insert()
    return {"message": "Shared"}


@router.get("/notifications", response_model=List[schemas.SharedItemOut])
async def get_notifications(current_user: models.User = Depends(get_current_user)):
    notifs = await models.SharedItem.find(
        models.SharedItem.to_user_id == current_user.id,
    ).sort("-created_at").limit(50).to_list()
    results = []
    for n in notifs:
        u = await models.User.get(n.from_user_id)
        d = n.model_dump()
        d['from_user'] = schemas.UserPublic.model_validate(u, from_attributes=True) if u else None
        results.append(d)
    return results


@router.post("/notifications/{notification_id}/seen", status_code=200)
async def mark_seen(notification_id: str, current_user: models.User = Depends(get_current_user)):
    n = await models.SharedItem.find_one(
        models.SharedItem.id == PydanticObjectId(notification_id),
        models.SharedItem.to_user_id == current_user.id,
    )
    if not n:
        raise HTTPException(404)
    n.seen = True
    await n.save()
    return {"message": "Marked seen"}


@router.get("/activity", response_model=List[schemas.ActivityItem])
async def friend_activity(current_user: models.User = Depends(get_current_user)):
    friendships = await models.Friendship.find(
        Or(
            models.Friendship.user_id == current_user.id,
            models.Friendship.friend_id == current_user.id,
        ),
        models.Friendship.status == models.FriendshipStatus.accepted
    ).to_list()
    friend_ids = set()
    for fr in friendships:
        other = fr.friend_id if fr.user_id == current_user.id else fr.user_id
        friend_ids.add(other)
    if not friend_ids:
        return []
    sessions = await models.GameSession.find(
        In(models.GameSession.user_id, list(friend_ids))
    ).sort("-played_at").limit(30).to_list()
    results = []
    u_ids = list(set([s.user_id for s in sessions]))
    s_ids = list(set([s.song_id for s in sessions]))
    users = await models.User.find(In(models.User.id, u_ids)).to_list()
    songs = await models.Song.find(In(models.Song.id, s_ids)).to_list()
    u_map = {u.id: u for u in users}
    s_map = {s.id: s for s in songs}
    for s in sessions:
        user = u_map.get(s.user_id)
        song = s_map.get(s.song_id)
        if user and song:
            results.append(schemas.ActivityItem(
                user=schemas.UserPublic.model_validate(user, from_attributes=True),
                song=schemas.SongOut.model_validate(song, from_attributes=True),
                played_at=s.played_at,
            ))
    return results
