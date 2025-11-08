from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Service, Handshake, ChatMessage

User = get_user_model()


class RegistrationHandshakeChatFlowTests(APITestCase):
    """Integration tests covering registration ➜ handshake ➜ chat flow."""

    def setUp(self):
        self.existing_user = User.objects.create_user(
            email="mentor@test.com",
            password="mentorpass",
            first_name="Mentor",
            last_name="User",
            timebank_balance=Decimal("5.00"),
        )

        self.service = Service.objects.create(
            user=self.existing_user,
            title="Guitar Mentoring",
            description="Improve your skills",
            type="Offer",
            duration=Decimal("1.00"),
            location_type="Online",
            status="Active",
            max_participants=1,
            schedule_type="One-Time",
            schedule_details="Nov 30, 2025 at 10:00",
        )

    def _register_user(self):
        payload = {
            "email": "learner@test.com",
            "password": "LearnerPass123!",
            "first_name": "Learner",
            "last_name": "User",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def _auth_headers(self, token: str) -> dict:
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def test_registration_to_chat_flow(self):
        # Register and capture tokens
        register_response = self._register_user()
        access_token = register_response.data["access"]
        refresh_token = register_response.data["refresh"]
        self.assertTrue(access_token)
        self.assertTrue(refresh_token)

        # Express interest (creates handshake)
        headers = self._auth_headers(access_token)
        interest_response = self.client.post(
            f"/api/services/{self.service.id}/interest/",
            format="json",
            **headers,
        )
        self.assertEqual(interest_response.status_code, status.HTTP_201_CREATED)
        handshake_id = interest_response.data["id"]
        handshake = Handshake.objects.get(id=handshake_id)
        self.assertEqual(handshake.status, "pending")

        # Provider accepts the handshake
        provider_headers = self._auth_headers(
            self.client.post(
                "/api/auth/login/",
                {"email": "mentor@test.com", "password": "mentorpass"},
                format="json",
            ).data["access"]
        )
        accept_response = self.client.post(
            f"/api/handshakes/{handshake_id}/accept/",
            format="json",
            **provider_headers,
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        # Learner sends chat message
        chat_payload = {"handshake_id": handshake_id, "body": "Excited to learn!"}
        chat_response = self.client.post(
            "/api/chats/",
            chat_payload,
            format="json",
            **headers,
        )
        self.assertEqual(chat_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            ChatMessage.objects.filter(handshake_id=handshake_id, body__icontains="Excited to learn!").exists()
        )

        # Provider replies
        chat_response_provider = self.client.post(
            "/api/chats/",
            {"handshake_id": handshake_id, "body": "Looking forward to it."},
            format="json",
            **provider_headers,
        )
        self.assertEqual(chat_response_provider.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            ChatMessage.objects.filter(handshake_id=handshake_id, body__icontains="Looking forward to it.").exists()
        )

    def test_registration_requires_strong_password(self):
        weak_payload = {
            "email": "weak@test.com",
            "password": "short",
            "first_name": "Weak",
            "last_name": "Password",
        }
        response = self.client.post("/api/auth/register/", weak_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
