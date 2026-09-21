from unittest import mock

from django.db import OperationalError
from django.test import TestCase


class HealthTests(TestCase):
    def test_live(self):
        response = self.client.get("/api/health/live")
        self.assertEqual(response.status_code, 200)

    def test_ready(self):
        response = self.client.get("/api/health/ready")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["database"], "up")

    def test_ready_when_database_is_down(self):
        with mock.patch("core.views.connection.cursor", side_effect=OperationalError):
            response = self.client.get("/api/health/ready")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["database"], "down")
