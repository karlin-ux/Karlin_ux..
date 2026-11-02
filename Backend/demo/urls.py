from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"customers", views.DemoCustomerViewSet, basename="demo-customers")
router.register(r"products", views.DemoProductViewSet, basename="demo-products")
router.register(r"services", views.DemoServiceViewSet, basename="demo-services")
router.register(r"orders", views.DemoOrderViewSet, basename="demo-orders")
router.register(r"bookings", views.DemoBookingViewSet, basename="demo-bookings")
router.register(r"applications", views.DemoApplicationViewSet, basename="demo-applications")
router.register(r"customer-applications", views.CustomerApplicationViewSet, basename="customer-applications")
router.register(r"notifications", views.DemoNotificationViewSet, basename="demo-notifications")
router.register(r"pages", views.DemoPageViewSet, basename="demo-pages")
router.register(r"media", views.DemoMediaAssetViewSet, basename="demo-media")
router.register(r"roles", views.DemoRoleViewSet, basename="demo-roles")
router.register(r"managers", views.DemoManagerViewSet, basename="demo-managers")
router.register(r"audit", views.DemoAuditLogViewSet, basename="demo-audit")
router.register(r"analytics-events", views.DemoAnalyticsEventViewSet, basename="demo-analytics-events")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", views.demo_dashboard),
    path("analytics-summary/", views.demo_analytics_summary),
    path("checkout/", views.checkout),
]