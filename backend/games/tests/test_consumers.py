from typing import Any

from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser
from django.test import TransactionTestCase, override_settings

from games.consumers import CLOSE_CANCELLED, CLOSE_FORBIDDEN, CLOSE_NOT_FOUND, CLOSE_UNAUTHENTICATED
from games.routing import websocket_urlpatterns
from games.services import create_game
from quizzes.models import Choice
from quizzes.tests import make_quiz
from users.models import Role, User
from users.tests import make_user

application = URLRouter(websocket_urlpatterns)


# Channels closes old database connections around consumer queries, which breaks TestCase transactions.
@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class GameConsumerTests(TransactionTestCase):
    def setUp(self) -> None:
        self.host = make_user("host")
        self.player = make_user("alice", Role.PLAYER)
        self.other_host = make_user("other-host")
        self.communicators: list[WebsocketCommunicator] = []
        quiz = make_quiz(self.host, questions=1)
        self.game = create_game(quiz)
        self.correct = Choice.objects.get(question__quiz=quiz, is_correct=True).pk

    async def connect(self, user: User | AnonymousUser, code: str | None = None) -> WebsocketCommunicator:
        communicator = WebsocketCommunicator(application, f"/ws/games/{code or self.game.code}")
        communicator.scope["user"] = user
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        self.communicators.append(communicator)
        return communicator

    async def disconnect_all(self) -> None:
        for communicator in self.communicators:
            await communicator.disconnect()

    async def receive(self, communicator: WebsocketCommunicator, kind: str) -> dict[str, Any]:
        message = await communicator.receive_json_from(timeout=2)
        self.assertEqual(message["type"], kind, message)
        return message

    async def assert_closed(self, communicator: WebsocketCommunicator, code: int) -> None:
        self.assertEqual(await communicator.receive_output(timeout=2), {"type": "websocket.close", "code": code})

    async def test_host_sees_players_join(self) -> None:
        host = await self.connect(self.host)
        lobby = await self.receive(host, "state")
        player = await self.connect(self.player)

        joined = await self.receive(host, "state")
        own = await self.receive(player, "state")

        self.assertEqual((lobby["game"]["status"], lobby["game"]["players"], lobby["you"]), ("lobby", [], None))
        self.assertEqual([p["nickname"] for p in joined["game"]["players"]], ["alice"])
        self.assertEqual(own["you"], joined["game"]["players"][0]["id"])
        await self.disconnect_all()

    async def test_connections_are_checked(self) -> None:
        cases = [
            (AnonymousUser(), self.game.code, CLOSE_UNAUTHENTICATED),
            (self.player, "ZZZZZZ", CLOSE_NOT_FOUND),
            (self.other_host, self.game.code, CLOSE_FORBIDDEN),
        ]
        for user, code, close_code in cases:
            with self.subTest(close_code=close_code):
                await self.assert_closed(await self.connect(user, code), close_code)
        await self.disconnect_all()

    async def test_a_question_is_played_and_revealed(self) -> None:
        host = await self.connect(self.host)
        await self.receive(host, "state")
        player = await self.connect(self.player)
        await self.receive(host, "state")
        await self.receive(player, "state")

        await player.send_json_to({"type": "start"})
        self.assertEqual((await self.receive(player, "error"))["message"], "Unknown move.")

        await host.send_json_to({"type": "start"})
        question = await self.receive(player, "state")
        self.assertEqual(question["game"]["status"], "question")
        await self.receive(host, "state")

        await player.send_json_to({"type": "answer", "question": 0, "choice": self.correct})
        reveal = await self.receive(host, "state")
        self.assertEqual(reveal["game"]["status"], "reveal")
        self.assertGreater(reveal["game"]["players"][0]["points"], 0)
        await self.disconnect_all()

    async def test_invalid_messages_get_an_error(self) -> None:
        host = await self.connect(self.host)
        await self.receive(host, "state")

        for message in ('["start"]', '{"type": "next", "question": "1"}', '{"type": "dance"}', "not json"):
            with self.subTest(message=message):
                await host.send_to(text_data=message)
                await self.receive(host, "error")
        await self.disconnect_all()

    async def test_cancelling_closes_every_connection(self) -> None:
        host = await self.connect(self.host)
        await self.receive(host, "state")
        player = await self.connect(self.player)
        await self.receive(player, "state")

        await host.send_json_to({"type": "cancel"})

        await self.assert_closed(player, CLOSE_CANCELLED)
        await self.disconnect_all()
