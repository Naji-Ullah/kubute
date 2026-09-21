from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower


class Role(models.TextChoices):
    HOST = "host", "Host"
    PLAYER = "player", "Player"


class UserManager(DjangoUserManager):
    def get_by_natural_key(self, username: str) -> "User":
        return self.get(**{f"{self.model.USERNAME_FIELD}__iexact": username})


class User(AbstractUser):
    first_name = None
    last_name = None
    name = models.CharField(max_length=100, blank=True)
    nickname = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.HOST)

    objects = UserManager()

    class Meta(AbstractUser.Meta):
        constraints = [
            models.UniqueConstraint(Lower("username"), name="users_user_username_ci_unique"),
            models.CheckConstraint(
                condition=Q(role=Role.HOST) | (~Q(name="") & ~Q(nickname="")),
                name="users_user_player_has_name_and_nickname",
            ),
        ]

    def __str__(self) -> str:
        return self.username

    def get_full_name(self) -> str:
        return self.name

    def get_short_name(self) -> str:
        return self.nickname or self.name or self.username
