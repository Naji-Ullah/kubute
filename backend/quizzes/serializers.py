from typing import Any

from rest_framework import serializers

from .models import Choice, Question, Quiz
from .services import ChoiceData, QuestionData, create_quiz, update_quiz

MIN_CHOICES = 2
MAX_CHOICES = 4
MAX_QUESTIONS = 50


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text", "is_correct"]
        read_only_fields = ["id"]


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "text", "time_limit", "choices"]
        read_only_fields = ["id"]

    def validate_choices(self, choices: list[ChoiceData]) -> list[ChoiceData]:
        if not MIN_CHOICES <= len(choices) <= MAX_CHOICES:
            raise serializers.ValidationError(f"Add between {MIN_CHOICES} and {MAX_CHOICES} answers.")
        if sum(choice["is_correct"] for choice in choices) != 1:
            raise serializers.ValidationError("Mark exactly one answer as correct.")
        return choices


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)
    is_played = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ["id", "title", "questions", "is_played", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_is_played(self, quiz: Quiz) -> bool:
        return getattr(quiz, "is_played", False)

    def validate_questions(self, questions: list[QuestionData]) -> list[QuestionData]:
        if not 1 <= len(questions) <= MAX_QUESTIONS:
            raise serializers.ValidationError(f"Add between 1 and {MAX_QUESTIONS} questions.")
        return questions

    def create(self, validated_data: dict[str, Any]) -> Quiz:
        return create_quiz(**validated_data)

    def update(self, instance: Quiz, validated_data: dict[str, Any]) -> Quiz:
        return update_quiz(instance, **validated_data)


class QuizSummarySerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(read_only=True)
    is_played = serializers.BooleanField(read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "question_count", "is_played", "updated_at"]
        read_only_fields = fields
