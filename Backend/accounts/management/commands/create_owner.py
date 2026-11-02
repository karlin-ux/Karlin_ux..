import os

from django.core.management.base import BaseCommand

from accounts.models import User


class Command(BaseCommand):
    help = "Create the Super Admin owner account (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--email", default=os.environ.get("OWNER_EMAIL"))
        parser.add_argument("--password", default=os.environ.get("OWNER_PASSWORD"))

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]
        if not email or not password:
            self.stderr.write("Provide --email and --password (or OWNER_EMAIL/OWNER_PASSWORD env).")
            return
        if User.objects.filter(email=email).exists():
            u = User.objects.get(email=email)
            u.role = User.ROLE_SUPERADMIN
            u.is_staff = True
            u.is_superuser = True
            if password:
                u.set_password(password)
            u.save()
            self.stdout.write(f"Updated existing owner: {email}")
            return
        u = User.objects.create_superuser(email=email, password=password)
        u.role = User.ROLE_SUPERADMIN
        u.save()
        self.stdout.write(self.style.SUCCESS(f"Created owner: {email}"))