from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"users", views.PlatformUserViewSet, basename="platform-users")
router.register(r"settings", views.GlobalSettingView, basename="platform-settings")
router.register(r"contact-messages", views.ContactMessageViewSet, basename="platform-contact-messages")

urlpatterns = [
    path("", include(router.urls)),
    path("analytics/", views.PlatformAnalyticsSummaryView.as_view()),
    path("audit/", views.PlatformAuditLogView.as_view()),
    path("security-events/", views.SecurityEventView.as_view()),
    path("notifications/", views.PlatformNotificationView.as_view()),
    path("health/", views.PlatformHealthView.as_view()),
    path("media-health/", views.PlatformMediaHealthView.as_view()),
    path("track/", views.TrackEventView.as_view()),
]