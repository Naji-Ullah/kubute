from django.db.models import Count, Exists, OuterRef, ProtectedError, QuerySet
from rest_framework import serializers, status, viewsets
from rest_framework.exceptions import APIException

from games.models import Game
from users.permissions import IsHost

from .models import Quiz
from .serializers import QuizSerializer, QuizSummarySerializer


class QuizLocked(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This quiz has been played, so it can’t be changed or deleted."
    default_code = "quiz_locked"


class QuizViewSet(viewsets.ModelViewSet):
    permission_classes = [IsHost]
    http_method_names = ["get", "post", "put", "delete"]

    def get_queryset(self) -> QuerySet[Quiz]:
        quizzes = Quiz.objects.filter(owner=self.request.user).annotate(
            is_played=Exists(Game.objects.filter(quiz=OuterRef("pk")))
        )
        if self.action == "list":
            return quizzes.annotate(question_count=Count("questions"))
        return quizzes.prefetch_related("questions__choices")

    def get_serializer_class(self) -> type[serializers.ModelSerializer]:
        return QuizSummarySerializer if self.action == "list" else QuizSerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer: serializers.BaseSerializer) -> None:
        if serializer.instance.is_played:
            raise QuizLocked
        serializer.save()

    def perform_destroy(self, instance: Quiz) -> None:
        try:
            instance.delete()
        except ProtectedError as exc:
            raise QuizLocked from exc
