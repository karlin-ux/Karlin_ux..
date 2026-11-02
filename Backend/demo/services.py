import random
from decimal import Decimal

from .models import (
    DemoAnalyticsEvent, DemoApplication, DemoBooking, DemoCustomer, DemoManager,
    DemoNotification, DemoOrder, DemoOrderItem, DemoPage, DemoProduct, DemoRole,
)


def seed_workspace(workspace):
    # roles
    admin_role = DemoRole.objects.create(workspace=workspace, name="Administrator", permissions={
        "users": {"view": True, "create": True, "edit": True, "delete": False},
        "orders": {"view": True, "create": True, "edit": True, "delete": False},
        "products": {"view": True, "create": True, "edit": True, "delete": True},
        "applications": {"view": True, "create": True, "edit": True, "delete": False},
        "media": {"view": True, "create": True, "edit": True, "delete": True},
        "analytics": {"view": True, "create": False, "edit": False, "delete": False},
        "settings": {"view": False, "create": False, "edit": False, "delete": False},
    })
    DemoRole.objects.create(workspace=workspace, name="Read-only Analyst", permissions={
        "users": {"view": True, "create": False, "edit": False, "delete": False},
        "orders": {"view": True, "create": False, "edit": False, "delete": False},
        "products": {"view": True, "create": False, "edit": False, "delete": False},
        "applications": {"view": True, "create": False, "edit": False, "delete": False},
        "media": {"view": True, "create": False, "edit": False, "delete": False},
        "analytics": {"view": True, "create": False, "edit": False, "delete": False},
        "settings": {"view": False, "create": False, "edit": False, "delete": False},
    })
    # customers
    customers = []
    for i in range(8):
        c = DemoCustomer.objects.create(
            workspace=workspace, name=f"Sample Customer {i+1}", email=f"customer{i+1}@example.com",
            phone=f"+1 555 000{i}", category=random.choice(["standard", "vip", "new"]),
            last_activity=None,
        )
        customers.append(c)
    # products
    products = []
    for i in range(10):
        p = DemoProduct.objects.create(
            workspace=workspace, name=f"Demo Product {i+1}",
            description="A demonstration product.",
            price=Decimal(str(random.choice([9.99, 19.99, 29.99, 49.99, 99.99]))),
            stock=random.randint(0, 50), category=random.choice(["Hardware", "Software", "Service"]),
            is_featured=(i < 3), is_active=True,
        )
        products.append(p)
    # orders
    for i in range(6):
        c = random.choice(customers)
        o = DemoOrder.objects.create(workspace=workspace, customer=c, status=random.choice(["new", "pending", "processing", "completed", "paid"]), total=Decimal("0.00"))
        total = Decimal("0.00")
        for _ in range(random.randint(1, 3)):
            prod = random.choice(products)
            qty = random.randint(1, 3)
            item = DemoOrderItem.objects.create(order=o, product=prod, product_name=prod.name, quantity=qty, unit_price=prod.price)
            total += prod.price * qty
        o.total = total
        o.save()
    # bookings
    import datetime
    for i in range(5):
        DemoBooking.objects.create(
            workspace=workspace, service_name=random.choice(["Consultation", "Demo Session", "Support Call"]),
            customer=random.choice(customers), customer_name=f"Sample Customer {i+1}",
            customer_email=f"customer{i+1}@example.com",
            date=datetime.date.today() + datetime.timedelta(days=random.randint(1, 14)),
            time=datetime.time(hour=random.choice([9, 10, 11, 14, 15]), minute=0),
            status=random.choice(["pending", "confirmed", "completed"]),
        )
    # applications
    for i in range(4):
        DemoApplication.objects.create(
            workspace=workspace, application_type=random.choice(["job", "service", "membership", "enquiry"]),
            applicant_name=f"Applicant {i+1}", applicant_email=f"applicant{i+1}@example.com",
            subject="Demo application", message="Sample application content.",
            status=random.choice(["new", "reviewing", "approved"]),
        )
    # pages
    DemoPage.objects.create(workspace=workspace, title="Home", slug="home", content="Welcome to demo site.", is_published=True)
    DemoPage.objects.create(workspace=workspace, title="About", slug="about", content="About us.", is_published=True)
    # notifications
    DemoNotification.objects.create(workspace=workspace, recipient_type="admin", title="Welcome", message="Demo workspace ready.")
    # managers
    DemoManager.objects.create(workspace=workspace, name="Sample Manager", email="manager@example.com", role=admin_role, is_active=True)
    # analytics events
    for i in range(20):
        DemoAnalyticsEvent.objects.create(workspace=workspace, event_type=random.choice(["page_view", "order_created", "booking_created"]), page=random.choice(["/", "/products", "/about"]))