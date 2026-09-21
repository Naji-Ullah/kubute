from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from core.testing import APITestCase

from .models import Role, User
from .serializers import HostRegistrationSerializer

PASSWORD = "kubute-pass-2026"


def make_user(username: str, role: Role = Role.HOST, **fields: str) -> User:
    if role == Role.PLAYER:
        fields = {"name": "Test Player", "nickname": username, **fields}
    return User.objects.create_user(username=username, password=PASSWORD, role=role, **fields)


class RegistrationTests(APITestCase):
    def test_host_registration_logs_in(self) -> None:
        response = self.client.post(
            reverse("auth-register-host"), {"username": "alice", "password": PASSWORD}
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], Role.HOST)
        self.assertEqual(self.client.get(reverse("auth-me")).data["username"], "alice")

    def test_player_registration_requires_name_and_nickname(self) -> None:
        response = self.client.post(
            reverse("auth-register-player"), {"username": "bob", "password": PASSWORD}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertCountEqual(response.data, ["name", "nickname"])

    def test_player_registration(self) -> None:
        response = self.client.post(
            reverse("auth-register-player"),
            {"username": "bob", "password": PASSWORD, "name": "Bob Stone", "nickname": "Bobby"},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            {key: response.data[key] for key in ("role", "name", "nickname")},
            {"role": Role.PLAYER, "name": "Bob Stone", "nickname": "Bobby"},
        )

    def test_usernames_are_case_insensitive(self) -> None:
        make_user("Alice")

        response = self.client.post(
            reverse("auth-register-host"), {"username": "alice", "password": PASSWORD}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_username_taken_between_validation_and_save(self) -> None:
        serializer = HostRegistrationSerializer(data={"username": "erin", "password": PASSWORD})
        serializer.is_valid(raise_exception=True)
        make_user("ERIN")

        with self.assertRaises(ValidationError):
            serializer.save()

    def test_weak_password_is_rejected(self) -> None:
        response = self.client.post(
            reverse("auth-register-host"), {"username": "alice", "password": "12345"}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)


class LoginTests(APITestCase):
    def test_login_is_case_insensitive_and_returns_role(self) -> None:
        make_user("carol", Role.PLAYER)

        response = self.client.post(reverse("auth-login"), {"username": "CAROL", "password": PASSWORD})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.PLAYER)

    def test_wrong_password(self) -> None:
        make_user("carol")

        response = self.client.post(reverse("auth-login"), {"username": "carol", "password": "wrong"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("sessionid", response.cookies)

    def test_login_requires_csrf_token(self) -> None:
        make_user("carol")
        client = APIClient(enforce_csrf_checks=True)
        credentials = {"username": "carol", "password": PASSWORD}

        rejected = client.post(reverse("auth-login"), credentials)
        client.get(reverse("auth-csrf"))
        accepted = client.post(
            reverse("auth-login"), credentials, HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value
        )

        self.assertEqual(rejected.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)

    def test_login_is_throttled(self) -> None:
        credentials = {"username": "nobody", "password": "wrong"}
        responses = [self.client.post(reverse("auth-login"), credentials) for _ in range(11)]

        self.assertEqual(responses[-1].status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class SessionTests(APITestCase):
    def test_me_requires_authentication(self) -> None:
        self.assertEqual(self.client.get(reverse("auth-me")).status_code, status.HTTP_403_FORBIDDEN)

    def test_logout(self) -> None:
        self.client.force_login(make_user("dave"))

        response = self.client.post(reverse("auth-logout"))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get(reverse("auth-me")).status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_when_signed_out_is_a_no_op(self) -> None:
        self.assertEqual(self.client.post(reverse("auth-logout")).status_code, status.HTTP_204_NO_CONTENT)
