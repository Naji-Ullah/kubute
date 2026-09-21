from datetime import datetime, timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from core.testing import APITestCase
from games.models import Game, Participant
from quizzes.models import Quiz
from quizzes.tests import make_quiz
from users.models import Role, User
from users.tests import make_user


def make_game(quiz: Quiz, code: str, finished_at: datetime | None = None) -> Game:
    if finished_at is None:
        return Game.objects.create(quiz=quiz, code=code)
    return Game.objects.create(quiz=quiz, code=code, status=Game.Status.FINISHED, finished_at=finished_at)


def join(game: Game, player: User, score: int = 0, rank: int | None = None) -> Participant:
    return Participant.objects.create(game=game, player=player, score=score, final_rank=rank)


class HistoryTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.player = make_user("player", Role.PLAYER)
        self.client.force_login(self.player)
        self.quiz = make_quiz(make_user("host"), "Capitals", questions=3)

    def test_history_lists_finished_games_newest_first(self) -> None:
        now = timezone.now()
        older = make_game(self.quiz, "AAAAAA", finished_at=now - timedelta(days=1))
        newer = make_game(self.quiz, "BBBBBB", finished_at=now)
        in_progress = make_game(self.quiz, "CCCCCC")
        join(older, self.player, score=900, rank=2)
        join(older, make_user("rival", Role.PLAYER), score=1200, rank=1)
        join(newer, self.player, score=1500, rank=1)
        join(in_progress, self.player)

        response = self.client.get(reverse("game-history"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([entry["game_code"] for entry in response.data["results"]], ["BBBBBB", "AAAAAA"])
        self.assertEqual(
            {key: response.data["results"][1][key] for key in ("quiz_title", "score", "final_rank")},
            {"quiz_title": "Capitals", "score": 900, "final_rank": 2},
        )
        self.assertEqual(response.data["results"][1]["player_count"], 2)
        self.assertEqual(response.data["results"][1]["question_count"], 3)

    def test_history_excludes_other_players(self) -> None:
        join(make_game(self.quiz, "AAAAAA", finished_at=timezone.now()), make_user("rival", Role.PLAYER))

        response = self.client.get(reverse("game-history"))

        self.assertEqual(response.data["count"], 0)

    def test_hosts_are_forbidden(self) -> None:
        self.client.force_login(self.quiz.owner)

        self.assertEqual(self.client.get(reverse("game-history")).status_code, status.HTTP_403_FORBIDDEN)


class PlayedQuizTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()
        host = make_user("host")
        self.client.force_login(host)
        self.quiz = make_quiz(host)
        make_game(self.quiz, "AAAAAA")

    def test_played_quiz_is_flagged(self) -> None:
        detail = self.client.get(reverse("quiz-detail", args=[self.quiz.pk]))
        listing = self.client.get(reverse("quiz-list"))

        self.assertTrue(detail.data["is_played"])
        self.assertTrue(listing.data["results"][0]["is_played"])

    def test_played_quiz_cannot_be_updated_or_deleted(self) -> None:
        payload = {
            "title": "New",
            "questions": [
                {
                    "text": "Q",
                    "time_limit": 20,
                    "choices": [{"text": "a", "is_correct": True}, {"text": "b", "is_correct": False}],
                }
            ],
        }

        update = self.client.put(reverse("quiz-detail", args=[self.quiz.pk]), payload, format="json")
        delete = self.client.delete(reverse("quiz-detail", args=[self.quiz.pk]))

        self.assertEqual(update.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(delete.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Quiz.objects.filter(pk=self.quiz.pk, title="Maths").exists())
