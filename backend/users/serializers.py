from typing import Any, ClassVar

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import Role, User

USERNAME_TAKEN = "That username is taken."


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "name", "nickname", "role"]
        read_only_fields = fields


class RegistrationSerializer(serializers.ModelSerializer):
    """Subclasses set `role`."""

    role: ClassVar[Role]
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ["username", "password"]
        extra_kwargs = {"username": {"validators": [User.username_validator]}}

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(USERNAME_TAKEN)
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        password = attrs.pop("password")
        try:
            validate_password(password, User(**attrs))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        attrs["password"] = password
        return attrs

    def create(self, validated_data: dict[str, Any]) -> User:
        try:
            with transaction.atomic():
                return User.objects.create_user(role=self.role, **validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError({"username": [USERNAME_TAKEN]}) from exc


class HostRegistrationSerializer(RegistrationSerializer):
    role = Role.HOST


class PlayerRegistrationSerializer(RegistrationSerializer):
    role = Role.PLAYER

    class Meta(RegistrationSerializer.Meta):
        fields = ["username", "password", "name", "nickname"]
        extra_kwargs = {
            **RegistrationSerializer.Meta.extra_kwargs,
            "name": {"required": True, "allow_blank": False},
            "nickname": {"required": True, "allow_blank": False},
        }


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        user = authenticate(self.context["request"], username=attrs["username"], password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Invalid username or password.")
        attrs["user"] = user
        return attrs
