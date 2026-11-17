from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("profile/", views.UpdateProfileView.as_view(), name="profile"),
    path("request-deletion/", views.AccountDeletionRequestView.as_view(), name="request-deletion"),
    # Google OAuth (disabled - unfinished/insecure path removed from functional use)
    path("google/", views.GoogleOAuthLoginView.as_view(), name="google_login"),
    path("google/callback/", views.GoogleOAuthCallbackView.as_view(), name="google_callback"),

    # Email verification
    path("verify-email/", views.EmailVerificationRequestView.as_view(), name="verify_email_request"),
    path("verify-email/confirm/", views.EmailVerificationConfirmView.as_view(), name="verify_email_confirm"),
    path("verify-email/<str:token>/", views.EmailVerificationConfirmView.as_view(), name="verify_email_confirm_token"),
    path("resend-verification/", views.ResendVerificationView.as_view(), name="resend_verification"),
    # Donation catalogue
    path("donations/products/", views.DonationProductListView.as_view(), name="donation_products"),
    path("donations/", views.DonationCreateView.as_view(), name="donation_create"),
]
