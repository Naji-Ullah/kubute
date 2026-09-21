from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

MIN_TIME_LIMIT = 5
MAX_TIME_LIMIT = 120


class Quiz(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quizzes")
    title = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        verbose_name_plural = "quizzes"

    def __str__(self) -> str:
        return self.title


class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    position = models.PositiveSmallIntegerField()
    text = models.CharField(max_length=300)
    time_limit = models.PositiveSmallIntegerField(
        default=20,
        validators=[MinValueValidator(MIN_TIME_LIMIT), MaxValueValidator(MAX_TIME_LIMIT)],
        help_text="Seconds",
    )

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["quiz", "position"], name="quizzes_question_unique_position"),
            models.CheckConstraint(
                condition=Q(time_limit__gte=MIN_TIME_LIMIT, time_limit__lte=MAX_TIME_LIMIT),
                name="quizzes_question_time_limit_range",
            ),
        ]

    def __str__(self) -> str:
        return self.text


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    position = models.PositiveSmallIntegerField()
    text = models.CharField(max_length=120)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["question", "position"], name="quizzes_choice_unique_position"),
            models.UniqueConstraint(
                fields=["question"], condition=Q(is_correct=True), name="quizzes_choice_one_correct"
            ),
        ]

    def __str__(self) -> str:
        return self.text
