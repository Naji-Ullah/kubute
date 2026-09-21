from django.db.models import QuerySet
from rest_framework import serializers

from quizzes.models import Quiz

from .models import Game, Participant
from .services import create_game


class OwnQuizField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self) -> QuerySet[Quiz]:
        return Quiz.objects.filter(owner=self.context["request"].user)


class GameCreateSerializer(serializers.ModelSerializer):
    quiz = OwnQuizField()

    class Meta:
        model = Game
        fields = ["code", "quiz"]
        read_only_fields = ["code"]

    def create(self, validated_data: dict[str, Quiz]) -> Game:
        return create_game(validated_data["quiz"])


class HistoryEntrySerializer(serializers.ModelSerializer):
    game_code = serializers.CharField(source="game.code")
    quiz_title = serializers.CharField(source="game.quiz.title")
    finished_at = serializers.DateTimeField(source="game.finished_at")
    player_count = serializers.IntegerField()
    question_count = serializers.IntegerField()

    class Meta:
        model = Participant
        fields = [
            "id",
            "game_code",
            "quiz_title",
            "finished_at",
            "score",
            "correct_answers",
            "final_rank",
            "player_count",
            "question_count",
        ]
        read_only_fields = fields
