from rest_framework import serializers
from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    honeypot = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ContactMessage
        fields = ["name", "email", "subject", "message", "honeypot"]

    def validate_name(self, v):
        v = v.strip()
        if len(v) < 2:
            raise serializers.ValidationError("Name is too short.")
        return v

    def validate_message(self, v):
        v = v.strip()
        if len(v) < 10:
            raise serializers.ValidationError("Message is too short.")
        return v

    def validate(self, data):
        if data.get("honeypot"):
            raise serializers.ValidationError("Spam detected.")
        return data