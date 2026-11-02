from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.MediaAssetViewSet, basename="media")

urlpatterns = [
    path("storage/", views.storage_usage, name="media-storage"),
    path("", include(router.urls)),
]