from typing import ClassVar

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from .models import Role


class HasRole(BasePermission):
    """Subclasses set `role`."""

    role: ClassVar[Role]

    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role == self.role)


class IsHost(HasRole):
    role = Role.HOST


class IsPlayer(HasRole):
    role = Role.PLAYER
