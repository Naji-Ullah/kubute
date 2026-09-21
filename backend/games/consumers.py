import json
from typing import Any

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from . import services

# Application close codes (4000-4999) tell the client not to reconnect.
CLOSE_UNAUTHENTICATED = 4401
CLOSE_FORBIDDEN = 4403
CLOSE_NOT_FOUND = 4404
CLOSE_CANCELLED = 4410


def _int(content: dict[str, Any], key: str) -> int:
    value = content.get(key)
    if type(value) is not int:
        raise services.GameError("Invalid message.")
    return value


class GameConsumer(AsyncJsonWebsocketConsumer):
    """One connection per browser tab. The host drives the game; players answer."""

    group: str | None = None
    game_id: int
    participant_id: int | None

    async def connect(self) -> None:
        await self.accept()
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return
        code = self.scope["url_route"]["kwargs"]["code"].upper()
        try:
            seat = await database_sync_to_async(services.take_seat)(code, user)
        except services.GameNotFound:
            await self.close(code=CLOSE_NOT_FOUND)
            return
        except services.GameAccessDenied:
            await self.close(code=CLOSE_FORBIDDEN)
            return

        self.game_id = seat.game_id
        self.participant_id = seat.participant_id
        self.group = f"game-{code}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        if seat.joined:
            await self.broadcast_state()
        else:
            await self.send_state(await database_sync_to_async(services.game_state)(self.game_id))

    async def disconnect(self, code: int) -> None:
        if self.group:
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive(self, text_data: str | None = None, bytes_data: bytes | None = None, **kwargs: Any) -> None:
        # The base class drops the connection on frames that aren't JSON text; reply with an error instead.
        try:
            content = json.loads(text_data) if text_data else None
        except json.JSONDecodeError:
            content = None
        await self.receive_json(content)

    async def receive_json(self, content: Any, **kwargs: Any) -> None:
        if not self.group:
            return
        try:
            if not isinstance(content, dict):
                raise services.GameError("Invalid message.")
            if self.participant_id is None:
                await self.host_move(content)
            else:
                await self.player_move(content)
        except services.GameError as exc:
            await self.send_json({"type": "error", "message": str(exc)})

    async def host_move(self, content: dict[str, Any]) -> None:
        match content.get("type"):
            case "start":
                changed = await database_sync_to_async(services.start_game)(self.game_id)
            case "end_question":
                changed = await database_sync_to_async(services.end_question)(self.game_id, _int(content, "question"))
            case "next":
                changed = await database_sync_to_async(services.advance)(self.game_id, _int(content, "question"))
            case "cancel":
                await database_sync_to_async(services.cancel_game)(self.game_id)
                await self.channel_layer.group_send(self.group, {"type": "game.cancelled"})
                return
            case _:
                raise services.GameError("Unknown move.")
        if changed:
            await self.broadcast_state()

    async def player_move(self, content: dict[str, Any]) -> None:
        if content.get("type") != "answer":
            raise services.GameError("Unknown move.")
        closed = await database_sync_to_async(services.submit_answer)(
            self.game_id, self.participant_id, _int(content, "question"), _int(content, "choice")
        )
        if closed:
            await self.broadcast_state()
        else:
            await self.channel_layer.group_send(self.group, {"type": "player.answered", "player": self.participant_id})

    async def broadcast_state(self) -> None:
        state = await database_sync_to_async(services.game_state)(self.game_id)
        await self.channel_layer.group_send(self.group, {"type": "game.update", "state": state})

    async def send_state(self, state: services.GameState) -> None:
        await self.send_json({"type": "state", "game": state, "you": self.participant_id})

    async def game_update(self, event: dict[str, Any]) -> None:
        await self.send_state(event["state"])

    async def player_answered(self, event: dict[str, Any]) -> None:
        await self.send_json({"type": "answered", "player": event["player"]})

    async def game_cancelled(self, event: dict[str, Any]) -> None:
        await self.close(code=CLOSE_CANCELLED)
