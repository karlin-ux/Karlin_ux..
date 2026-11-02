from rest_framework import serializers

from .models import MediaAsset, MediaVariant


class MediaVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaVariant
        fields = ["id", "variant_type", "mime_type", "file_size", "width", "height", "created_at"]


class MediaAssetSerializer(serializers.ModelSerializer):
    variants = MediaVariantSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = [
            "id", "original_filename", "mime_type", "file_size", "category",
            "width", "height", "alt_text", "description", "created_at", "updated_at",
            "variants", "file_url",
        ]
        read_only_fields = ["id", "mime_type", "file_size", "category", "width", "height", "created_at", "updated_at", "variants", "file_url"]

    def get_file_url(self, obj):
        return f"/api/media/{obj.id}/file/"


class MediaAssetUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAsset
        fields = ["alt_text", "description", "original_filename"]