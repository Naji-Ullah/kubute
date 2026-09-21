from django.conf import settings
from django.db import models
from django.db.models import Q


class Game(models.Model):
    class Status(models.TextChoices):
        LOBBY = "lobby", "Lobby"
        IN_PROGRESS = "in_progress", "In progress"
        FINISHED = "finished", "Finished"

    quiz = models.ForeignKey("quizzes.Quiz", on_delete=models.PROTECT, related_name="games")
    code = models.CharField(max_length=6, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LOBBY)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status="finished") | Q(finished_at__isnull=False),
                name="games_game_finished_has_timestamp",
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
