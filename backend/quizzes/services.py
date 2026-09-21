from typing import TypedDict

from django.db import transaction

from users.models import User

from .models import Choice, Question, Quiz


class ChoiceData(TypedDict):
    text: str
    is_correct: bool


class QuestionData(TypedDict):
    text: str
    time_limit: int
    choices: list[ChoiceData]


def _replace_questions(quiz: Quiz, questions: list[QuestionData]) -> Quiz:
    quiz.questions.all().delete()
    created = Question.objects.bulk_create(
        Question(quiz=quiz, position=position, text=data["text"], time_limit=data["time_limit"])
        for position, data in enumerate(questions)
    )
    Choice.objects.bulk_create(
        Choice(question=question, position=position, text=choice["text"], is_correct=choice["is_correct"])
        for question, data in zip(created, questions, strict=True)
        for position, choice in enumerate(data["choices"])
    )
    return Quiz.objects.prefetch_related("questions__choices").get(pk=quiz.pk)


@transaction.atomic
def create_quiz(*, owner: User, title: str, questions: list[QuestionData]) -> Quiz:
    quiz = Quiz.objects.create(owner=owner, title=title)
    return _replace_questions(quiz, questions)


@transaction.atomic
def update_quiz(quiz: Quiz, *, title: str, questions: list[QuestionData]) -> Quiz:
    quiz.title = title
    quiz.save(update_fields=["title", "updated_at"])
    return _replace_questions(quiz, questions)
