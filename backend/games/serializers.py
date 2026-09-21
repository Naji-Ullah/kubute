from rest_framework import serializers

from .models import Participant


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
