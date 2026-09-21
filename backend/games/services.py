import secrets
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TypedDict

from django.db import IntegrityError, transaction
from django.db.models import Count, F, OuterRef, Subquery, Sum, Window
from django.db.models.functions import Coalesce, Rank
from django.utils import timezone

from quizzes.models import Question, Quiz
from users.models import Role, User

from .models import Answer, Game, Participant

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6
CODE_ATTEMPTS = 5

MIN_POINTS = 500
MAX_POINTS = 1000
# Answers sent in the last moment still count when they arrive slightly late.
ANSWER_GRACE = timedelta(seconds=1)


class GameError(Exception):
    """A move that breaks the rules. The message is safe to show to the user."""


class GameNotFound(GameError):
    pass


class GameAccessDenied(GameError):
    pass


@dataclass(frozen=True)
class Seat:
    game_id: int
    participant_id: int | None
    joined: bool


class PlayerState(TypedDict):
    id: int
    nickname: str
    score: int
    rank: int
    answered: bool
    points: int | None


class ChoiceState(TypedDict):
    id: int
    text: str
    correct: bool | None
    picks: int | None


class QuestionState(TypedDict):
    index: int
    text: str
    time_limit: int
    ends_at: str
    choices: list[ChoiceState]


class GameState(TypedDict):
    code: str
    status: str
    quiz_title: str
    question_count: int
    question: QuestionState | None
    players: list[PlayerState]
    server_time: str


def create_game(quiz: Quiz) -> Game:
    for _ in range(CODE_ATTEMPTS):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        try:
            with transaction.atomic():
                return Game.objects.create(quiz=quiz, code=code)
        except IntegrityError:
            continue
    raise RuntimeError("Could not generate a unique game code.")


@transaction.atomic
def take_seat(code: str, user: User) -> Seat:
    """Admit the host, or a player: new players can only join from the lobby."""
    game = Game.objects.select_for_update(of=("self",)).select_related("quiz").filter(code=code.upper()).first()
    if game is None:
        raise GameNotFound("There's no game with that code.")

    if user.role == Role.HOST:
        if game.quiz.owner_id != user.pk:
            raise GameAccessDenied("Only the host of this game can run it.")
        return Seat(game.pk, participant_id=None, joined=False)

    participant = game.participants.filter(player=user).first()
    if participant:
        return Seat(game.pk, participant.pk, joined=False)
    if game.status != Game.Status.LOBBY:
        raise GameAccessDenied("This game has already started.")
    participant = Participant.objects.create(game=game, player=user)
    return Seat(game.pk, participant.pk, joined=True)


def _lock(game_id: int) -> Game:
    # The host may have cancelled (deleted) the game while this move waited for the lock.
    game = Game.objects.select_for_update().filter(pk=game_id).first()
    if game is None:
        raise GameNotFound("This game no longer exists.")
    return game


def _question(game: Game, index: int) -> Question:
    return Question.objects.get(quiz_id=game.quiz_id, position=index)


def _open_question(game: Game, index: int) -> None:
    question = _question(game, index)
    game.status = Game.Status.QUESTION
    game.question_index = index
    game.question_ends_at = timezone.now() + timedelta(seconds=question.time_limit)
    game.save(update_fields=["status", "question_index", "question_ends_at"])


def _reveal(game: Game) -> None:
    game.status = Game.Status.REVEAL
    game.save(update_fields=["status"])

    # Totals are recomputed from every answer, so revealing twice can't double count.
    answers = Answer.objects.filter(participant=OuterRef("pk")).values("participant")
    total = answers.annotate(total=Sum("points")).values("total")
    correct = answers.filter(choice__is_correct=True).annotate(count=Count("pk")).values("count")
    game.participants.update(score=Coalesce(Subquery(total), 0), correct_answers=Coalesce(Subquery(correct), 0))


def _finish(game: Game) -> None:
    game.status = Game.Status.FINISHED
    game.finished_at = timezone.now()
    game.save(update_fields=["status", "finished_at"])

    ranked = list(game.participants.annotate(position=Window(Rank(), order_by=F("score").desc())))
    for participant in ranked:
        participant.final_rank = participant.position
    Participant.objects.bulk_update(ranked, ["final_rank"])


def score_answer(*, correct: bool, answered_at: datetime, ends_at: datetime, time_limit: int) -> int:
    if not correct:
        return 0
    remaining = min(max((ends_at - answered_at).total_seconds(), 0), time_limit)
    return MIN_POINTS + round((MAX_POINTS - MIN_POINTS) * remaining / time_limit)


@transaction.atomic
def start_game(game_id: int) -> bool:
    game = _lock(game_id)
    if game.status != Game.Status.LOBBY:
        return False
    if not game.participants.exists():
        raise GameError("Wait for at least one player to join.")
    _open_question(game, 0)
    return True


@transaction.atomic
def submit_answer(game_id: int, participant_id: int, question_index: int, choice_id: int) -> bool:
    """Record an answer. Returns True when it was the last one and the question closed."""
    game = _lock(game_id)
    now = timezone.now()
    if game.status != Game.Status.QUESTION or game.question_index != question_index:
        raise GameError("This question is closed.")
    if now > game.question_ends_at + ANSWER_GRACE:
        raise GameError("Time's up.")

    question = _question(game, question_index)
    choice = question.choices.filter(pk=choice_id).first()
    if choice is None:
        raise GameError("That answer isn't one of the choices.")
    if Answer.objects.filter(participant_id=participant_id, question=question).exists():
        raise GameError("You've already answered.")

    points = score_answer(
        correct=choice.is_correct, answered_at=now, ends_at=game.question_ends_at, time_limit=question.time_limit
    )
    Answer.objects.create(participant_id=participant_id, question=question, choice=choice, points=points, answered_at=now)

    answered = Answer.objects.filter(question=question, participant__game=game).count()
    if answered < game.participants.count():
        return False
    _reveal(game)
    return True


@transaction.atomic
def end_question(game_id: int, question_index: int) -> bool:
    game = _lock(game_id)
    if game.status != Game.Status.QUESTION or game.question_index != question_index:
        return False
    _reveal(game)
    return True


@transaction.atomic
def advance(game_id: int, question_index: int) -> bool:
    """Move from a revealed question to the next one, or finish after the last."""
    game = _lock(game_id)
    if game.status != Game.Status.REVEAL or game.question_index != question_index:
        return False
    next_index = question_index + 1
    if Question.objects.filter(quiz_id=game.quiz_id, position=next_index).exists():
        _open_question(game, next_index)
    else:
        _finish(game)
    return True


@transaction.atomic
def cancel_game(game_id: int) -> None:
    game = _lock(game_id)
    if game.status != Game.Status.LOBBY:
        raise GameError("A game can only be cancelled before it starts.")
    game.delete()


def _ranks(players: list[Participant]) -> dict[int, int]:
    """Players with the same score share a rank: 1, 2, 2, 4."""
    rank_of_score: dict[int, int] = {}
    for position, score in enumerate(sorted((p.score for p in players), reverse=True), start=1):
        rank_of_score.setdefault(score, position)
    return {p.pk: rank_of_score[p.score] for p in players}


def _points(answer: Answer | None, revealed: bool) -> int | None:
    if not revealed:
        return None
    return answer.points if answer else 0


def game_state(game_id: int) -> GameState:
    """What everyone in the game can see. Correct answers stay hidden until the reveal."""
    game = Game.objects.select_related("quiz").get(pk=game_id)
    players = list(game.participants.select_related("player").order_by("joined_at", "pk"))
    ranks = _ranks(players)
    revealed = game.status == Game.Status.REVEAL

    question_state: QuestionState | None = None
    answers: dict[int, Answer] = {}
    if game.status in (Game.Status.QUESTION, Game.Status.REVEAL):
        question = Question.objects.prefetch_related("choices").get(quiz_id=game.quiz_id, position=game.question_index)
        answers = {a.participant_id: a for a in Answer.objects.filter(question=question, participant__game=game)}
        picks = Counter(a.choice_id for a in answers.values())
        question_state = {
            "index": question.position,
            "text": question.text,
            "time_limit": question.time_limit,
            "ends_at": game.question_ends_at.isoformat(),
            "choices": [
                {
                    "id": choice.pk,
                    "text": choice.text,
                    "correct": choice.is_correct if revealed else None,
                    "picks": picks[choice.pk] if revealed else None,
                }
                for choice in question.choices.all()
            ],
        }

    if game.status != Game.Status.LOBBY:
        players.sort(key=lambda p: ranks[p.pk])

    return {
        "code": game.code,
        "status": game.status,
        "quiz_title": game.quiz.title,
        "question_count": game.quiz.questions.count(),
        "question": question_state,
        "players": [
            {
                "id": p.pk,
                "nickname": p.player.nickname,
                "score": p.score,
                "rank": ranks[p.pk],
                "answered": p.pk in answers,
                "points": _points(answers.get(p.pk), revealed),
            }
            for p in players
        ],
        "server_time": timezone.now().isoformat(),
    }
