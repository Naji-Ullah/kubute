from django.urls import path

from .views import GameCreateView, HistoryView

urlpatterns = [
    path("games", GameCreateView.as_view(), name="game-create"),
    path("games/history", HistoryView.as_view(), name="game-history"),
]
