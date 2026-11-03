# Phase 4.11: PostgreSQL exclusion constraint for booking overlap protection.
# This migration adds a duration_minutes field to DemoBooking and preserves
# the existing PostgreSQL exclusion constraint for 30-minute baseline protection.
# The application-level _validate_booking uses service.duration_minutes or 30.
# Cancelled bookings release their time slots.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('demo', '0007_demobooking_unique_booking_slot_noncancelled'),
    ]

    operations = [
        migrations.AddField(
            model_name='demobooking',
            name='duration_minutes',
            field=models.PositiveIntegerField(default=30),
        ),
    ]