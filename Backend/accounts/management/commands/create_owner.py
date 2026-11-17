import os

from django.core.management.base import BaseCommand, CommandError

from accounts.models import User


class Command(BaseCommand):
    help = "Create the Super Admin owner account (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--email", default=os.environ.get("OWNER_EMAIL"))
        parser.add_argument("--password", default=os.environ.get("OWNER_PASSWORD"))

    def handle(self, *args, **options):
        email = (options.get("email") or "").strip()
        password = options.get("password")
        if not email or not password:
            raise CommandError("Owner email and password are required.")
        canonical_email = User.objects.canonicalize_email(email)
        if not canonical_email:
            raise CommandError("A valid owner email is required.")
        matches = User.objects.filter(email__iexact=canonical_email).order_by("pk")
        count = matches.count()
        if count > 1:
            raise CommandError(
                "Multiple accounts match the provided email. Aborting safely; resolve duplicates before promoting an owner."
            )
        if count == 1:
            u = matches.first()
            u.role = User.ROLE_SUPERADMIN
            u.is_staff = True
            u.is_superuser = True
            if password:
                u.set_password(password)
            # Do not rewrite existing stored email/username automatically.
            u.save()
            self.stdout.write(f"Updated existing owner: {u.email}")
            return
        u = User.objects.create_superuser(email=canonical_email, password=password)
        u.role = User.ROLE_SUPERADMIN
        u.save(update_fields=["role", "updated_at"])
        self.stdout.write(self.style.SUCCESS(f"Created owner: {u.email}"))