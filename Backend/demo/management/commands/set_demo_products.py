from django.core.management.base import BaseCommand
from accounts.models import Workspace
from demo.models import DemoProduct


DESIRED = [
    {
        "name": "Shoe",
        "category": "Footwear",
        "description": "Demo product: a stylish shoe. View this product in 3D.",
        "price": "79.99",
        "stock": 12,
    },
    {
        "name": "Watch",
        "category": "Accessories",
        "description": "Demo product: a classic watch. View this product in 3D.",
        "price": "149.99",
        "stock": 8,
    },
    {
        "name": "Apple",
        "category": "Produce",
        "description": "Demo product: a fresh apple. View this product in 3D.",
        "price": "1.49",
        "stock": 50,
    },
]


class Command(BaseCommand):
    help = "Ensure exactly 3 demo products (Shoe, Watch, Apple) exist per workspace."

    def handle(self, *args, **options):
        workspaces = Workspace.objects.all()
        if not workspaces.exists():
            self.stdout.write(self.style.WARNING("No workspaces found."))
            return

        for ws in workspaces:
            keep_ids = []
            for item in DESIRED:
                obj, created = DemoProduct.objects.update_or_create(
                    workspace=ws,
                    name=item["name"],
                    defaults={
                        "category": item["category"],
                        "description": item["description"],
                        "price": item["price"],
                        "stock": item["stock"],
                        "is_published": True,
                        "is_active": True,
                        "is_featured": False,
                    },
                )
                keep_ids.append(obj.id)
                action = "Created" if created else "Updated"
                self.stdout.write(f"{action} {obj.name} for workspace {ws.id}")

            deleted, _ = DemoProduct.objects.filter(workspace=ws).exclude(id__in=keep_ids).delete()
            if deleted:
                self.stdout.write(f"Removed {deleted} other demo product(s) for workspace {ws.id}")

        self.stdout.write(self.style.SUCCESS("Demo products set to Shoe, Watch, Apple."))
