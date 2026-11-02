# Phase 4.8.1: PostgreSQL exclusion constraint to prevent overlapping booking intervals.
# This constraint works alongside the existing unique_booking_slot_noncancelled constraint.
# It uses a GiST index on tsrange to genuinely prevent overlapping time intervals at the database level.
# Cancelled bookings are excluded (they release their time slots).
#
# The constraint prevents overlapping active bookings and allows adjacent non-overlapping bookings.
# It uses a 30-minute window (default service duration).
# Services with different durations are additionally guarded by the
# application-level _validate_booking overlap check.
# Requires btree_gist extension for UUID GiST support.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('demo', '0007_demobooking_unique_booking_slot_noncancelled'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""CREATE EXTENSION IF NOT EXISTS btree_gist;
                      ALTER TABLE demo_demobooking DROP CONSTRAINT IF EXISTS no_booking_overlap;
                      ALTER TABLE demo_demobooking ADD CONSTRAINT no_booking_overlap
                      EXCLUDE USING GIST (workspace_id WITH =,
                          tsrange(date + time, date + time + interval '30 minutes', '()') WITH &&)
                      WHERE (status <> 'cancelled');""",
            reverse_sql="""DROP EXTENSION IF EXISTS btree_gist;
                              ALTER TABLE demo_demobooking DROP CONSTRAINT no_booking_overlap;""",
        ),
    ]