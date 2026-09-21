from django.conf import settings
from django.db import models
from django.db.models import Q


class Game(models.Model):
    class Status(models.TextChoices):
        LOBBY = "lobby", "Lobby"
        QUESTION = "question", "Question"
        REVEAL = "reveal", "Reveal"
        FINISHED = "finished", "Finished"

    quiz = models.ForeignKey("quizzes.Quiz", on_delete=models.PROTECT, related_name="games")
    code = models.CharField(max_length=6, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LOBBY)
    question_index = models.PositiveSmallIntegerField(null=True, blank=True)
    question_ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status="finished") | Q(finished_at__isnull=False),
                name="games_game_finished_has_timestamp",
            ),
            models.CheckConstraint(
                condition=~Q(status__in=["question", "reveal"])
                | Q(question_index__isnull=False, question_ends_at__isnull=False),
                name="games_game_live_has_question",
            ),
        ]

    def __str__(self) -> str:
        return self.code


class Participant(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="participants")
    player = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="participations")
    score = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveSmallIntegerField(default=0)
    final_rank = models.PositiveSmallIntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["game", "player"], name="games_participant_unique_player"),
        ]

    def __str__(self) -> str:
        return f"{self.player} in {self.game}"


class Answer(models.Model):
    participant = models.ForeignKey(Participant, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey("quizzes.Question", on_delete=models.PROTECT, related_name="+")
    choice = models.ForeignKey("quizzes.Choice", on_delete=models.PROTECT, related_name="+")
    points = models.PositiveIntegerField()
    answered_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["participant", "question"], name="games_answer_one_per_question"),
        ]

    def __str__(self) -> str:
        return f"{self.participant}: {self.choice}"
