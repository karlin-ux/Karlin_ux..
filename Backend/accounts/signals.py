import logging
import re

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.text import slugify

from .models import CustomerProfile, User, Workspace, WorkspaceMembership

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def bootstrap_user_workspace(sender, instance, created, **kwargs):
    if not created:
        return
    # Customer profile for everyone
    CustomerProfile.objects.get_or_create(user=instance, defaults={"display_name": instance.email.split("@")[0]})
    if instance.role != User.ROLE_SUPERADMIN:
        base = slugify(instance.email.split("@")[0]) or "workspace"
        slug = f"{base}-{str(instance.pk)[:8]}"
        # ensure uniqueness
        from django.utils.crypto import get_random_string
        ws = Workspace.objects.create(owner=instance, name=f"{instance.email.split('@')[0]}'s Workspace", slug=slug)
        WorkspaceMembership.objects.create(user=instance, workspace=ws, role=WorkspaceMembership.ROLE_WORKSPACE_ADMIN)
        # seed demo data
        try:
            # Run seeding in a savepoint so a failure rolls back only the demo
            # data and never poisons the surrounding registration transaction.
            with transaction.atomic():
                from demo.services import seed_workspace
                seed_workspace(ws)
        except Exception:
            # Registration must not fail because demo seeding failed, but the
            # failure must be visible in logs rather than silently swallowed.
            logger.exception("Failed to seed demo workspace %s", ws.pk)