from django.core.management.base import BaseCommand

from showcase.models import ProjectCaseStudy, ShowcaseCategory, ShowcaseFeature, Technology


class Command(BaseCommand):
    help = "Seed showcase data."

    def handle(self, *args, **options):
        cat, _ = ShowcaseCategory.objects.get_or_create(name="Customer Experience", slug="customer-experience")
        cat2, _ = ShowcaseCategory.objects.get_or_create(name="Admin Experience", slug="admin-experience")
        cat3, _ = ShowcaseCategory.objects.get_or_create(name="Advanced Features", slug="advanced-features")

        features = [
            (cat, "Product Catalogue", "product-catalogue", True),
            (cat, "Shopping Cart", "shopping-cart", True),
            (cat, "3D Product Viewer", "3d-viewer", True),
            (cat, "Booking System", "booking-system", True),
            (cat2, "Admin Dashboard", "admin-dashboard", True),
            (cat2, "Manager Permissions", "manager-permissions", True),
            (cat2, "Media Library", "media-library", True),
            (cat2, "CMS Demo", "cms-demo", True),
            (cat3, "Command Palette", "command-palette", True),
            (cat3, "Local Assistant", "local-assistant", True),
            (cat3, "Voice Interface", "voice-interface", True),
        ]
        for c, title, slug, avail in features:
            ShowcaseFeature.objects.get_or_create(category=c, slug=slug, defaults={"title": title, "is_available": avail, "is_simulated": True})

        techs = ["Django", "Django REST Framework", "React", "TypeScript", "PostgreSQL", "Docker", "Three.js", "Tailwind CSS", "Vite"]
        for t in techs:
            Technology.objects.get_or_create(name=t)

        ProjectCaseStudy.objects.get_or_create(slug="karlin-ux-portfolio", defaults={
            "title": "Karlin_ux Portfolio Platform",
            "summary": "Full-stack portfolio and interactive showcase.",
            "description": "A complete platform demonstrating customer, admin and super admin experiences.",
        })
        self.stdout.write(self.style.SUCCESS("Seeded showcase."))