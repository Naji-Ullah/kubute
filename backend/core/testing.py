from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase as DRFAPITestCase


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class APITestCase(DRFAPITestCase):
    def setUp(self) -> None:
        cache.clear()
