from django.db.models import Count, QuerySet
from rest_framework import serializers, viewsets

from users.permissions import IsHost

from .models import Quiz
from .serializers import QuizSerializer, QuizSummarySerializer


class QuizViewSet(viewsets.ModelViewSet):
    permission_classes = [IsHost]
    http_method_names = ["get", "post", "put", "delete"]

    def get_queryset(self) -> QuerySet[Quiz]:
        quizzes = Quiz.objects.filter(owner=self.request.user)
        if self.action == "list":
            return quizzes.annotate(question_count=Count("questions"))
        return quizzes.prefetch_related("questions__choices")

    def get_serializer_class(self) -> type[serializers.ModelSerializer]:
        return QuizSummarySerializer if self.action == "list" else QuizSerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.save(owner=self.request.user)
