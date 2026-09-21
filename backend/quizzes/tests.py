from typing import Any

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status

from core.testing import APITestCase
from users.models import Role, User
from users.tests import make_user

from .models import Question, Quiz
from .services import create_quiz


def question(text: str = "2 + 2?", correct: int = 1, answers: int = 4, **fields: Any) -> dict[str, Any]:
    return {
        "text": text,
        "time_limit": 20,
        "choices": [{"text": f"Answer {i}", "is_correct": i == correct} for i in range(answers)],
        **fields,
    }


def make_quiz(owner: User, title: str = "Maths", questions: int = 1) -> Quiz:
    return create_quiz(owner=owner, title=title, questions=[question(f"Q{i}") for i in range(questions)])


class QuizCreateTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.host = make_user("host")
        self.client.force_login(self.host)

    def test_create_quiz_with_questions_in_order(self) -> None:
        payload = {"title": "Maths", "questions": [question("First"), question("Second", correct=0, answers=2)]}

        response = self.client.post(reverse("quiz-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual([q["text"] for q in response.data["questions"]], ["First", "Second"])
        self.assertEqual([c["is_correct"] for c in response.data["questions"][1]["choices"]], [True, False])
        self.assertEqual(Quiz.objects.get().owner, self.host)

    def test_create_query_count_does_not_grow_with_questions(self) -> None:
        def create(questions: int) -> int:
            payload = {"title": "Q", "questions": [question(f"Q{i}") for i in range(questions)]}
            with CaptureQueriesContext(connection) as queries:
                self.client.post(reverse("quiz-list"), payload, format="json")
            return len(queries)

        self.assertEqual(create(1), create(10))

    def test_invalid_questions_are_rejected(self) -> None:
        cases = {
            "no questions": {"title": "Empty", "questions": []},
            "one answer": {"title": "Q", "questions": [question(answers=1, correct=0)]},
            "five answers": {"title": "Q", "questions": [question(answers=5)]},
            "no correct answer": {"title": "Q", "questions": [question(correct=-1)]},
            "time limit too short": {"title": "Q", "questions": [question(time_limit=2)]},
        }
        for name, payload in cases.items():
            with self.subTest(name):
                response = self.client.post(reverse("quiz-list"), payload, format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("questions", response.data)
        self.assertFalse(Quiz.objects.exists())

    def test_two_correct_answers_are_rejected(self) -> None:
        payload = question()
        payload["choices"][0]["is_correct"] = True

        response = self.client.post(reverse("quiz-list"), {"title": "Q", "questions": [payload]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class QuizAccessTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.host = make_user("host")
        self.client.force_login(self.host)

    def test_list_shows_only_own_quizzes_with_question_count(self) -> None:
        make_quiz(self.host, "Mine", questions=3)
        make_quiz(make_user("other"), "Theirs")

        response = self.client.get(reverse("quiz-list"))

        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Mine")
        self.assertEqual(response.data["results"][0]["question_count"], 3)

    def test_list_query_count_does_not_grow_with_quizzes(self) -> None:
        make_quiz(self.host)
        with CaptureQueriesContext(connection) as one:
            self.client.get(reverse("quiz-list"))
        for _ in range(5):
            make_quiz(self.host, questions=2)
        with CaptureQueriesContext(connection) as many:
            self.client.get(reverse("quiz-list"))

        self.assertEqual(len(one), len(many))

    def test_other_hosts_quiz_is_not_found(self) -> None:
        quiz = make_quiz(make_user("other"))

        response = self.client.get(reverse("quiz-detail", args=[quiz.pk]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_players_and_anonymous_users_are_forbidden(self) -> None:
        self.client.force_login(make_user("player", Role.PLAYER))
        self.assertEqual(self.client.get(reverse("quiz-list")).status_code, status.HTTP_403_FORBIDDEN)

        self.client.logout()
        self.assertEqual(self.client.get(reverse("quiz-list")).status_code, status.HTTP_403_FORBIDDEN)


class QuizUpdateTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.host = make_user("host")
        self.client.force_login(self.host)
        self.quiz = make_quiz(self.host, questions=3)

    def test_update_replaces_questions(self) -> None:
        payload = {"title": "Renamed", "questions": [question("Only one")]}

        response = self.client.put(reverse("quiz-detail", args=[self.quiz.pk]), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Renamed")
        self.assertEqual(list(Question.objects.values_list("text", flat=True)), ["Only one"])

    def test_partial_update_is_not_allowed(self) -> None:
        response = self.client.patch(reverse("quiz-detail", args=[self.quiz.pk]), {"title": "x"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete(self) -> None:
        response = self.client.delete(reverse("quiz-detail", args=[self.quiz.pk]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Quiz.objects.exists())
