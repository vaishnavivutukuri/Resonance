import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Set
from fastapi import WebSocket

from game_logic import INITIAL_HEALTH, get_loop_config, INFINITE_SPEED_SCALE_PER_LOOP
from models import Difficulty

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.user_map: Dict[WebSocket, str] = {}

    async def connect(self, room_id: str, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.rooms.setdefault(room_id, []).append(websocket)
        self.user_map[websocket] = user_id
        logger.info("WS connected: user=%s room=%s", user_id, room_id)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.rooms:
            self.rooms[room_id] = [ws for ws in self.rooms[room_id] if ws != websocket]
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        self.user_map.pop(websocket, None)

    async def broadcast(self, room_id: str, message: dict, exclude: Optional[WebSocket] = None):
        for ws in list(self.rooms.get(room_id, [])):
            if ws == exclude:
                continue
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass

    async def send_to(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            pass

    def get_room_users(self, room_id: str) -> List[str]:
        return [self.user_map[ws] for ws in self.rooms.get(room_id, []) if ws in self.user_map]


manager = ConnectionManager()


class DuelRoom:
    def __init__(
        self,
        room_id: str,
        player1_id: str,
        player2_id: str,
        difficulty: Difficulty,
        mode: str,
    ):
        self.room_id = room_id
        self.player_ids = [player1_id, player2_id]
        self.difficulty = difficulty
        self.mode = mode
        self.loop_number = 0
        self.connected: Set[str] = set()
        self.state = "waiting"
        self.health: Dict[str, float] = {pid: INITIAL_HEALTH for pid in self.player_ids}
        self.score: Dict[str, int] = {pid: 0 for pid in self.player_ids}
        self.combo: Dict[str, int] = {pid: 0 for pid in self.player_ids}
        self.finished: Dict[str, bool] = {pid: False for pid in self.player_ids}
        self.alive: Dict[str, bool] = {pid: True for pid in self.player_ids}
        self.winner_id: Optional[str] = None

    def player_joined(self, user_id: str):
        self.connected.add(user_id)

    def both_connected(self) -> bool:
        return all(pid in self.connected for pid in self.player_ids)

    def update_tick(self, user_id: str, health: float, score: int, combo: int):
        self.health[user_id] = health
        self.score[user_id] = score
        self.combo[user_id] = combo

    def player_died(self, user_id: str):
        self.alive[user_id] = False
        survivors = [pid for pid in self.player_ids if self.alive[pid]]
        if survivors:
            self.winner_id = survivors[0]

    def player_finished(self, user_id: str):
        self.finished[user_id] = True

    def all_finished(self) -> bool:
        return all(self.finished.values())

    def anyone_dead(self) -> bool:
        return any(not v for v in self.alive.values())

    def resolve_winner_by_score(self):
        p1, p2 = self.player_ids
        if self.score[p1] > self.score[p2]:
            self.winner_id = p1
        elif self.score[p2] > self.score[p1]:
            self.winner_id = p2
        else:
            self.winner_id = p1 if self.health[p1] >= self.health[p2] else p2

    def start_next_loop(self):
        self.loop_number += 1
        for pid in self.player_ids:
            self.finished[pid] = False

    def get_loop_config(self) -> dict:
        return get_loop_config(self.difficulty, self.loop_number)


_active_rooms: Dict[str, DuelRoom] = {}


def create_duel_room(
    room_id: str,
    player1_id: str,
    player2_id: str,
    difficulty: Difficulty,
    mode: str,
) -> DuelRoom:
    room = DuelRoom(room_id, player1_id, player2_id, difficulty, mode)
    _active_rooms[room_id] = room
    return room


def get_duel_room(room_id: str) -> Optional[DuelRoom]:
    return _active_rooms.get(room_id)


def remove_duel_room(room_id: str):
    _active_rooms.pop(room_id, None)


async def handle_duel_websocket(
    websocket: WebSocket,
    room_id: str,
    user_id: str,
    db_callback=None,
):
    await manager.connect(room_id, websocket, user_id)
    room = get_duel_room(room_id)
    if room is None:
        await manager.send_to(websocket, {"type": "error", "message": "Room not found"})
        await websocket.close()
        return
    room.player_joined(user_id)
    await manager.broadcast(room_id, {
        "type": "player_joined",
        "user_id": user_id,
        "connected_count": len(room.connected),
    })
    if room.both_connected() and room.state == "waiting":
        room.state = "countdown"
        start_at_ms = _ms_now() + 3500
        cfg = room.get_loop_config()
        await manager.broadcast(room_id, {
            "type": "countdown_start",
            "start_at_ms": start_at_ms,
            "loop_number": room.loop_number,
            "difficulty_config": cfg,
        })
        room.state = "playing"
    try:
        async for raw in _ws_iter(websocket):
            msg = json.loads(raw)
            msg_type = msg.get("type")
            if msg_type == "tick":
                room.update_tick(
                    user_id,
                    health=float(msg.get("health", INITIAL_HEALTH)),
                    score=int(msg.get("score", 0)),
                    combo=int(msg.get("combo", 0)),
                )
                await manager.broadcast(room_id, {
                    "type": "opponent_tick",
                    "user_id": user_id,
                    "health": room.health[user_id],
                    "score": room.score[user_id],
                    "combo": room.combo[user_id],
                }, exclude=websocket)
            elif msg_type == "player_dead":
                room.player_died(user_id)
                await manager.broadcast(room_id, {
                    "type": "player_dead",
                    "user_id": user_id,
                    "winner_id": room.winner_id,
                    "loop_number": room.loop_number,
                })
                room.state = "finished"
                if db_callback:
                    await db_callback(room.winner_id, room_id, room.loop_number)
            elif msg_type == "player_finished":
                room.player_finished(user_id)
                await manager.broadcast(room_id, {
                    "type": "player_finished",
                    "user_id": user_id,
                })
                if room.all_finished() and not room.anyone_dead():
                    if room.mode == "infinite" and room.loop_number < 50:
                        room.start_next_loop()
                        cfg = room.get_loop_config()
                        start_at_ms = _ms_now() + 2000
                        await manager.broadcast(room_id, {
                            "type": "loop_start",
                            "loop_number": room.loop_number,
                            "start_at_ms": start_at_ms,
                            "difficulty_config": cfg,
                        })
                    else:
                        room.resolve_winner_by_score()
                        room.state = "finished"
                        await manager.broadcast(room_id, {
                            "type": "match_end",
                            "winner_id": room.winner_id,
                            "scores": room.score,
                            "health": room.health,
                            "loops_survived": room.loop_number,
                        })
                        if db_callback:
                            await db_callback(room.winner_id, room_id, room.loop_number)
    except Exception as exc:
        logger.error("WS error in room=%s user=%d: %s", room_id, user_id, exc)
    finally:
        manager.disconnect(room_id, websocket)
        await manager.broadcast(room_id, {
            "type": "opponent_disconnected",
            "user_id": user_id,
        })


def _ms_now() -> int:
    return int(datetime.utcnow().timestamp() * 1000)


async def _ws_iter(websocket: WebSocket):
    while True:
        try:
            data = await websocket.receive_text()
            yield data
        except Exception:
            break
