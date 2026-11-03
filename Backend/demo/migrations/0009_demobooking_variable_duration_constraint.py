# Phase 4.15: Enforce variable-duration PostgreSQL booking integrity.
# This migration replaces the fixed 30-minute exclusion constraint with one that
# uses each booking's stored duration_minutes value.
#
# Migration uses RunSQL operations executed in order:
#   1. CREATE EXTENSION IF NOT EXISTS btree_gist
#   2. ALTER TABLE ... ADD CONSTRAINT no_booking_overlap_var
#
# The constraint expression uses each booking's own duration_minutes value:
#   tsrange(date + time, date + time + duration_minutes * interval '1 minute', '()')
# WITH &&   where   status <> 'cancelled'
# 
# Note on syntax: the EXCLUDE USING gist clause has one level of parentheses
# wrapping the tsrange expression, followed by WITH &&, then one closing paren
# for the gist parenthesis, then WHERE.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('demo', '0008_demobooking_exclusion_no_overlap'),
    ]

    operations = [
        # Step 1: Create the btree_gist GiST index extension.
        # This must run before the constraint because the constraint references the GiST operator
        # class for the UUID workspace_id column.
        migrations.RunSQL(
            "CREATE EXTENSION IF NOT EXISTS btree_gist;",
            "DROP EXTENSION btree_gist;",
        ),

        # Step 2: Add the variable-duration exclusion constraint.
        # The constraint uses each booking's stored duration_minutes value to calculate
        # the occupied time interval, providing variable-duration overlap protection
        # at the database level.
        # Syntax: EXCLUDE USING gist ( workspace_id WITH =, tsrange(lower, upper) WITH && ) WHERE condition
        migrations.RunSQL(
            "ALTER TABLE demo_demobooking "
            "ADD CONSTRAINT no_booking_overlap_var "
            "EXCLUDE USING gist ("
            "    workspace_id WITH =, "
            "    tsrange("
            "        date + time, "
            "        date + time + duration_minutes * interval '1 minute', "
            "        '()'"
            ") WITH &&"
            ") WHERE (status <> 'cancelled');",
            "ALTER TABLE demo_demobooking DROP CONSTRAINT no_booking_overlap_var;",
        ),
    ]