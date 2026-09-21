from django.urls import path

from . import views
from .serializers import HostRegistrationSerializer, PlayerRegistrationSerializer

urlpatterns = [
    path("csrf", views.CsrfView.as_view(), name="auth-csrf"),
    path(
        "register/host",
        views.RegisterView.as_view(serializer_class=HostRegistrationSerializer),
        name="auth-register-host",
    ),
    path(
        "register/player",
        views.RegisterView.as_view(serializer_class=PlayerRegistrationSerializer),
        name="auth-register-player",
    ),
    path("login", views.LoginView.as_view(), name="auth-login"),
    path("logout", views.LogoutView.as_view(), name="auth-logout"),
    path("me", views.MeView.as_view(), name="auth-me"),
]
