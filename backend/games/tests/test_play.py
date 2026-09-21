from datetime import timedelta

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from core.testing import APITestCase
from games.models import Game, Participant
from games.services import (
    CODE_ALPHABET,
    GameAccessDenied,
    GameError,
    GameNotFound,
    advance,
    cancel_game,
    create_game,
    end_question,
    game_state,
    score_answer,
    start_game,
    submit_answer,
    take_seat,
)
from quizzes.models import Choice
from quizzes.tests import make_quiz
from users.models import Role
from users.tests import make_user


class ScoreAnswerTests(TestCase):
    def test_faster_correct_answers_score_more(self) -> None:
        ends_at = timezone.now()

        def score(seconds_left: float, correct: bool = True) -> int:
            answered_at = ends_at - timedelta(seconds=seconds_left)
            return score_answer(correct=correct, answered_at=answered_at, ends_at=ends_at, time_limit=20)

        self.assertEqual(score(20), 1000)
        self.assertEqual(score(10), 750)
        self.assertEqual(score(0), 500)
        self.assertEqual(score(-1), 500)
        self.assertEqual(score(20, correct=False), 0)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class GameTests(TestCase):
    def setUp(self) -> None:
        self.host = make_user("host")
        self.quiz = make_quiz(self.host, questions=2)
        self.game = create_game(self.quiz)
        self.alice = make_user("alice", Role.PLAYER)
        self.bob = make_user("bob", Role.PLAYER)

    def choice(self, index: int, correct: bool) -> Choice:
        return Choice.objects.filter(question__quiz=self.quiz, question__position=index, is_correct=correct).first()

    def answer(self, participant_id: int, index: int, correct: bool = True) -> bool:
        return submit_answer(self.game.pk, participant_id, index, self.choice(index, correct).pk)

    def start_with_players(self) -> tuple[int, int]:
        alice = take_seat(self.game.code, self.alice).participant_id
        bob = take_seat(self.game.code, self.bob).participant_id
        start_game(self.game.pk)
        return alice, bob

    def refresh(self) -> Game:
        self.game.refresh_from_db()
        return self.game

    def test_code_is_six_unambiguous_characters(self) -> None:
        self.assertEqual(len(self.game.code), 6)
        self.assertLessEqual(set(self.game.code), set(CODE_ALPHABET))

    def test_players_join_the_lobby_once(self) -> None:
        first = take_seat(self.game.code.lower(), self.alice)
        again = take_seat(self.game.code, self.alice)

        self.assertTrue(first.joined)
        self.assertFalse(again.joined)
        self.assertEqual(first.participant_id, again.participant_id)
        self.assertEqual(self.game.participants.count(), 1)

    def test_only_the_quiz_owner_can_host(self) -> None:
        self.assertIsNone(take_seat(self.game.code, self.host).participant_id)
        with self.assertRaises(GameAccessDenied):
            take_seat(self.game.code, make_user("other-host"))

    def test_unknown_code(self) -> None:
        with self.assertRaises(GameNotFound):
            take_seat("ZZZZZZ", self.alice)

    def test_new_players_cannot_join_after_the_start(self) -> None:
        take_seat(self.game.code, self.alice)
        start_game(self.game.pk)

        with self.assertRaises(GameAccessDenied):
            take_seat(self.game.code, self.bob)
        self.assertFalse(take_seat(self.game.code, self.alice).joined)

    def test_start_needs_a_player(self) -> None:
        with self.assertRaises(GameError):
            start_game(self.game.pk)

    def test_start_opens_the_first_question_once(self) -> None:
        take_seat(self.game.code, self.alice)

        self.assertTrue(start_game(self.game.pk))
        self.assertFalse(start_game(self.game.pk))
        game = self.refresh()
        self.assertEqual((game.status, game.question_index), (Game.Status.QUESTION, 0))
        self.assertAlmostEqual(game.question_ends_at, timezone.now() + timedelta(seconds=20), delta=timedelta(seconds=2))

    def test_question_closes_and_scores_when_everyone_answered(self) -> None:
        alice, bob = self.start_with_players()

        self.assertFalse(self.answer(alice, 0, correct=True))
        self.assertTrue(self.answer(bob, 0, correct=False))

        self.assertEqual(self.refresh().status, Game.Status.REVEAL)
        scores = dict(self.game.participants.values_list("pk", "score"))
        self.assertGreaterEqual(scores[alice], 950)
        self.assertEqual(scores[bob], 0)
        self.assertEqual(Participant.objects.get(pk=alice).correct_answers, 1)

    def test_answers_that_break_the_rules_are_rejected(self) -> None:
        alice, _ = self.start_with_players()
        other_question_choice = self.choice(1, correct=True).pk
        cases = {
            "wrong question": lambda: self.answer(alice, 1),
            "choice from another question": lambda: submit_answer(self.game.pk, alice, 0, other_question_choice),
        }
        for name, move in cases.items():
            with self.subTest(name), self.assertRaises(GameError):
                move()

        self.answer(alice, 0)
        with self.assertRaisesMessage(GameError, "already answered"):
            self.answer(alice, 0)

    def test_late_answers_are_rejected(self) -> None:
        alice, _ = self.start_with_players()
        Game.objects.filter(pk=self.game.pk).update(question_ends_at=timezone.now() - timedelta(seconds=5))

        with self.assertRaisesMessage(GameError, "Time's up"):
            self.answer(alice, 0)

    def test_ending_a_question_twice_does_not_double_the_score(self) -> None:
        alice, _ = self.start_with_players()
        self.answer(alice, 0)

        self.assertTrue(end_question(self.game.pk, 0))
        score = Participant.objects.get(pk=alice).score
        self.assertFalse(end_question(self.game.pk, 0))
        self.assertEqual(Participant.objects.get(pk=alice).score, score)

    def test_game_runs_to_the_end_and_ranks_players(self) -> None:
        alice, bob = self.start_with_players()
        for index in range(2):
            self.answer(alice, index, correct=True)
            self.answer(bob, index, correct=False)
            self.assertFalse(advance(self.game.pk, index + 1))
            self.assertTrue(advance(self.game.pk, index))

        game = self.refresh()
        self.assertEqual(game.status, Game.Status.FINISHED)
        self.assertIsNotNone(game.finished_at)
        ranks = dict(game.participants.values_list("pk", "final_rank"))
        self.assertEqual(ranks, {alice: 1, bob: 2})

    def test_players_with_the_same_score_share_a_rank(self) -> None:
        self.start_with_players()
        end_question(self.game.pk, 0)
        advance(self.game.pk, 0)
        end_question(self.game.pk, 1)
        advance(self.game.pk, 1)

        self.assertEqual(set(self.game.participants.values_list("final_rank", flat=True)), {1})
        self.assertEqual([p["rank"] for p in game_state(self.game.pk)["players"]], [1, 1])

    def test_cancel_only_before_the_start(self) -> None:
        take_seat(self.game.code, self.alice)
        other = create_game(self.quiz)

        cancel_game(other.pk)
        start_game(self.game.pk)

        self.assertFalse(Game.objects.filter(pk=other.pk).exists())
        with self.assertRaises(GameNotFound):
            start_game(other.pk)
        with self.assertRaises(GameError):
            cancel_game(self.game.pk)

    def test_state_hides_the_correct_answer_until_the_reveal(self) -> None:
        alice, _ = self.start_with_players()
        self.answer(alice, 0, correct=True)

        during = game_state(self.game.pk)
        self.assertEqual({(c["correct"], c["picks"]) for c in during["question"]["choices"]}, {(None, None)})
        self.assertEqual({p["nickname"]: p["answered"] for p in during["players"]}, {"alice": True, "bob": False})
        self.assertEqual({p["points"] for p in during["players"]}, {None})

        end_question(self.game.pk, 0)
        after = game_state(self.game.pk)
        correct = [c for c in after["question"]["choices"] if c["correct"]]
        self.assertEqual([c["picks"] for c in correct], [1])
        self.assertEqual([p["nickname"] for p in after["players"]], ["alice", "bob"])
        self.assertEqual(after["players"][1]["points"], 0)


class GameCreateApiTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.host = make_user("host")
        self.client.force_login(self.host)

    def test_host_creates_a_game_for_their_quiz(self) -> None:
        quiz = make_quiz(self.host)

        response = self.client.post(reverse("game-create"), {"quiz": quiz.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Game.objects.get().code, response.data["code"])

    def test_other_hosts_quiz_is_rejected(self) -> None:
        quiz = make_quiz(make_user("other"))

        response = self.client.post(reverse("game-create"), {"quiz": quiz.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Game.objects.exists())

    def test_players_cannot_create_games(self) -> None:
        self.client.force_login(make_user("player", Role.PLAYER))

        response = self.client.post(reverse("game-create"), {"quiz": make_quiz(self.host).pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
