from django.db.models import Count, QuerySet
from rest_framework.generics import CreateAPIView, ListAPIView

from users.permissions import IsHost, IsPlayer

from .models import Game, Participant
from .serializers import GameCreateSerializer, HistoryEntrySerializer


class GameCreateView(CreateAPIView):
    permission_classes = [IsHost]
    serializer_class = GameCreateSerializer


class HistoryView(ListAPIView):
    permission_classes = [IsPlayer]
    serializer_class = HistoryEntrySerializer

    def get_queryset(self) -> QuerySet[Participant]:
        return (
            Participant.objects.filter(player=self.request.user, game__status=Game.Status.FINISHED)
            .select_related("game__quiz")
            .annotate(
                player_count=Count("game__participants", distinct=True),
                question_count=Count("game__quiz__questions", distinct=True),
            )
            .order_by("-game__finished_at", "-id")
        )
