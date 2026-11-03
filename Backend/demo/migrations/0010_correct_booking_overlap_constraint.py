# Phase 4.17: Correct booking range semantics and migration integrity.
# This migration replaces the fixed 30-minute exclusion constraint's range boundary
# from '()' (both exclusive) to '[)' (start-inclusive, end-excluded).
#
# Migration uses RunPython with connection.cursor() to execute the EXCLUDE USING gist
# SQL, bypassing Django's CursorWrapper which cannot parse the [) syntax.
# Migration order: runs after 0009 (which created btree_gist extension and the constraint).

from django.db import migrations


def _correct_range_semantics(apps, schema_editor):
    """Drop the incorrect constraint and create the corrected [) boundary version."""
    from django.db import connections

    # Step 1: Drop the existing constraint using Django's connection.cursor()
    with connections['default'].cursor() as cursor:
        cursor.execute("ALTER TABLE demo_demobooking DROP CONSTRAINT IF EXISTS no_booking_overlap_var;")

    # Step 2: Create the corrected constraint with [) boundary
    # Using connection.cursor() with multi-line SQL formatting (as verified working).
    # The [) boundary means: start is included, end is excluded.
    # This ensures bookings 09:00-10:00 and 10:00-10:30 are allowed (adjacent),
    # while bookings 09:00-10:00 and 09:30-10:30 are rejected (overlapping).
    constraint_sql = (
        "ALTER TABLE demo_demobooking "
        "ADD CONSTRAINT no_booking_overlap_var "
        "EXCLUDE USING gist ("
        "    workspace_id WITH =, "
        "    tsrange("
        "        date + time, "
        "        date + time + duration_minutes * interval '1 minute', "
        "        '[)'"
        ") WITH &&)"
        " WHERE (status <> 'cancelled');"
    )

    with connections['default'].cursor() as cursor:
        cursor.execute(constraint_sql)
        connections['default'].connection.commit()

    # Step 3: Verify the constraint uses the [) boundary
    with connections['default'].cursor() as cursor:
        cursor.execute(
            "SELECT conname, pg_get_constraintdef(oid) "
            "FROM pg_constraint "
            "WHERE conrelid = 'demo_demobooking'::regclass "
            "AND conname = 'no_booking_overlap_var';"
        )
        result = cursor.fetchone()
        if result is None:
            raise RuntimeError("Migration failed: constraint not created.")
        else:
            conname, condef = result
            if "'[)" not in condef:
                raise RuntimeError(
                    f"Migration verification failed: constraint definition does not contain '[)'. "
                    f"Got: {condef}"
                )


def _reverse_range_semantics(apps, schema_editor):
    """Reverse operation: drop the [) constraint and restore the () boundary."""
    from django.db import connections

    with connections['default'].cursor() as cursor:
        cursor.execute("ALTER TABLE demo_demobooking DROP CONSTRAINT no_booking_overlap_var;")

    # Re-create the old () boundary constraint for rollback
    constraint_sql = (
        "ALTER TABLE demo_demobooking "
        "ADD CONSTRAINT no_booking_overlap_var "
        "EXCLUDE USING gist ("
        "    workspace_id WITH =, "
        "    tsrange("
        "        date + time, "
        "        date + time + duration_minutes * interval '1 minute', "
        "        '()'"
        ") WITH &&)"
        " WHERE (status <> 'cancelled');"
    )

    with connections['default'].cursor() as cursor:
        cursor.execute(constraint_sql)
        connections['default'].connection.commit()


class Migration(migrations.Migration):

    dependencies = [
        ('demo', '0009_demobooking_variable_duration_constraint'),
    ]

    operations = [
        migrations.RunPython(_correct_range_semantics, _reverse_range_semantics),
    ]