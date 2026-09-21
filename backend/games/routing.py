from django.urls import path

from .consumers import GameConsumer

websocket_urlpatterns = [
    path("ws/games/<str:code>", GameConsumer.as_asgi()),
]
