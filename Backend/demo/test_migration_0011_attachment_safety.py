import uuid
from unittest import SkipTest

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone


APP = "demo"
MIGRATE_FROM = [(APP, "0010_correct_booking_overlap_constraint")]
MIGRATE_TO = [(APP, "0011_align_demoapplication_attachments_to_demomediaasset")]
OLD_THROUGH = "demo_demoapplication_attachments"
TMP_THROUGH = "demo_demoapplication_attachments_old_media"


class DemoApplicationAttachmentMigration0011Tests(TransactionTestCase):
    """Focused migration safety tests for demo.0011 (PostgreSQL schema/data behavior)."""

    serialized_rollback = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        if connection.vendor != "postgresql":
            raise SkipTest("Migration 0011 safety tests require PostgreSQL.")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate(MIGRATE_FROM)
        old_apps = self.executor.loader.project_state(MIGRATE_FROM).apps

        User = old_apps.get_model("accounts", "User")
        Workspace = old_apps.get_model("accounts", "Workspace")
        DemoApplication = old_apps.get_model(APP, "DemoApplication")
        MediaAsset = old_apps.get_model("media", "MediaAsset")

        # Historical model field detection must be reliable (local/concrete fields only).
        local_field_names = {f.name for f in User._meta.local_fields}
        local_field_names |= {getattr(f, "attname", None) for f in User._meta.local_fields}
        local_field_names.discard(None)

        def has_local_field(name):
            return name in local_field_names

        # Actual DB schema at this migration state may include NOT NULL columns (e.g. is_verified)
        # that the historical ORM model does not define. Detect actual columns explicitly.
        with connection.cursor() as cursor:
            db_user_columns = {
                col.name for col in connection.introspection.get_table_description(cursor, "accounts_user")
            }

        db_only_required = {
            name
            for name in ("is_verified", "email_verified_at")
            if name in db_user_columns and not has_local_field(name)
        }

        def create_user(email):
            orm_data = {"email": email}
            if has_local_field("is_active"):
                orm_data["is_active"] = True
            if has_local_field("username"):
                orm_data["username"] = email
            if has_local_field("role"):
                orm_data["role"] = "standard"
            if has_local_field("is_verified"):
                orm_data["is_verified"] = False
            if has_local_field("email_verified_at"):
                orm_data["email_verified_at"] = None

            # Never pass DB-only columns to the historical ORM model when it does not define them.
            # If such NOT NULL DB columns exist, use a parameterized SQL insert with actual DB columns only.
            if db_only_required:
                cols = []
                vals = []
                for key in ("email", "username", "is_active", "role", "is_verified", "email_verified_at"):
                    if key in db_user_columns:
                        if key == "email":
                            cols.append(key)
                            vals.append(email)
                        elif key == "username":
                            cols.append(key)
                            vals.append(email)
                        elif key == "is_active":
                            cols.append(key)
                            vals.append(True)
                        elif key == "role":
                            cols.append(key)
                            vals.append("standard")
                        elif key == "is_verified":
                            cols.append(key)
                            vals.append(False)
                        elif key == "email_verified_at":
                            cols.append(key)
                            vals.append(None)

                now = timezone.now()
                for ts in ("date_joined", "created_at", "updated_at"):
                    if ts in db_user_columns and ts not in cols:
                        cols.append(ts)
                        vals.append(now)
                if "last_login" in db_user_columns and "last_login" not in cols:
                    cols.append("last_login")
                    vals.append(None)
                if "password" in db_user_columns and "password" not in cols:
                    cols.append("password")
                    vals.append("!")
                if "is_staff" in db_user_columns and "is_staff" not in cols:
                    cols.append("is_staff")
                    vals.append(False)
                if "is_superuser" in db_user_columns and "is_superuser" not in cols:
                    cols.append("is_superuser")
                    vals.append(False)
                if "first_name" in db_user_columns and "first_name" not in cols:
                    cols.append("first_name")
                    vals.append("")
                if "last_name" in db_user_columns and "last_name" not in cols:
                    cols.append("last_name")
                    vals.append("")

                placeholders = ",".join(["%s"] * len(cols))
                col_sql = ",".join([connection.ops.quote_name(c) for c in cols])
                table_sql = connection.ops.quote_name(User._meta.db_table)
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"INSERT INTO {table_sql} ({col_sql}) VALUES ({placeholders}) RETURNING id",
                        vals,
                    )
                    user_id = cursor.fetchone()[0]
                return User.objects.get(pk=user_id)

            return User.objects.create(**orm_data)

        self.user = create_user("mig-user@example.com")
        self.workspace = Workspace.objects.create(name="WS", slug="ws", owner=self.user)
        self.other_user = create_user("mig-other@example.com")
        self.other_workspace = Workspace.objects.create(name="WS2", slug="ws2", owner=self.other_user)

        self.app = DemoApplication.objects.create(
            workspace=self.workspace,
            application_type="enquiry",
            applicant_name="Applicant",
            applicant_email="applicant@example.com",
            status="new",
        )
        self.media = MediaAsset.objects.create(
            workspace=self.workspace,
            owner=self.user,
            original_filename="doc.txt",
            storage_path="uploads/doc.txt",
            mime_type="text/plain",
            file_size=42,
            category="document",
            alt_text="alt",
            description="desc",
        )

    def _migrate_to_target(self):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(MIGRATE_TO)
        return executor.loader.project_state(MIGRATE_TO).apps

    def _insert_old_association(self, app_id, media_id):
        with connection.cursor() as cursor:
            cursor.execute(
                f"INSERT INTO {OLD_THROUGH} (demoapplication_id, mediaasset_id) VALUES (%s, %s) RETURNING id",
                [app_id, media_id],
            )
            return cursor.fetchone()[0]

    def _get_media_fk_constraint(self, table_name):
        """Return (name, definition) for FK constraint on mediaasset_id, if present."""
        sql = """
            SELECT con.conname, pg_get_constraintdef(con.oid)
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE rel.relname = %s
              AND nsp.nspname = current_schema()
              AND con.contype = 'f'
              AND pg_get_constraintdef(con.oid) LIKE '%%(mediaasset_id)%%'
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, [table_name])
            row = cursor.fetchone()
        return row if row else None

    def _drop_constraint(self, table_name, constraint_name):
        with connection.cursor() as cursor:
            cursor.execute(
                f"ALTER TABLE {connection.ops.quote_name(table_name)} "
                f"DROP CONSTRAINT {connection.ops.quote_name(constraint_name)}"
            )

    def _add_constraint(self, table_name, constraint_name, definition):
        # definition comes from pg_get_constraintdef (trusted catalog value), not user input.
        with connection.cursor() as cursor:
            cursor.execute(
                f"ALTER TABLE {connection.ops.quote_name(table_name)} "
                f"ADD CONSTRAINT {connection.ops.quote_name(constraint_name)} {definition}"
            )

    def _fixture_teardown(self):
        # Migration tests may leave schema/data in non-standard states and retain
        # TMP_THROUGH (intentional production rollback-safety table). Ensure a clean,
        # isolated state for Django's TransactionTestCase cleanup without dropping the
        # retained table or weakening/removing its production foreign keys.
        try:
            # Return to pre-0011 schema where possible so expected tables/state exist.
            executor = MigrationExecutor(connection)
            executor.loader.build_graph()
            try:
                executor.migrate(MIGRATE_FROM)
            except Exception:
                pass

            with connection.cursor() as cursor:
                tables = set(connection.introspection.table_names(cursor))
                # Clear retained-table rows created by tests (test isolation only; no CASCADE,
                # table/constraints preserved). This avoids flush/truncate FK dependency issues.
                if TMP_THROUGH in tables:
                    cursor.execute(f"DELETE FROM {connection.ops.quote_name(TMP_THROUGH)}")
                # If target-state new through table remains for any reason, clear it too.
                if OLD_THROUGH in tables:
                    # Only safe when at/returned to expected schema; ignore if structure differs.
                    try:
                        cursor.execute(f"DELETE FROM {connection.ops.quote_name(OLD_THROUGH)}")
                    except Exception:
                        pass
        finally:
            super()._fixture_teardown()

    def _table_names(self):
        with connection.cursor() as cursor:
            return set(connection.introspection.table_names(cursor))

    def test_valid_association_preserved_with_metadata_and_original_table_retained(self):
        self._insert_old_association(self.app.id, self.media.id)

        apps = self._migrate_to_target()
        DemoApplication = apps.get_model(APP, "DemoApplication")
        DemoMediaAsset = apps.get_model(APP, "DemoMediaAsset")

        app = DemoApplication.objects.get(id=self.app.id)
        attachments = list(app.attachments.all())
        self.assertEqual(len(attachments), 1)
        copied = attachments[0]
        self.assertIsInstance(copied, DemoMediaAsset)
        self.assertEqual(copied.workspace_id, self.workspace.id)
        self.assertEqual(copied.file, "uploads/doc.txt")
        self.assertEqual(copied.original_name, "doc.txt")
        self.assertEqual(copied.mime_type, "text/plain")
        self.assertEqual(copied.size, 42)
        self.assertEqual(copied.alt_text, "alt")
        self.assertEqual(copied.description, "desc")

        # Original through table must be preserved (not dropped) for rollback safety.
        self.assertIn(TMP_THROUGH, self._table_names())
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT demoapplication_id, mediaasset_id FROM {TMP_THROUGH}"
            )
            rows = cursor.fetchall()
        self.assertEqual(rows, [(self.app.id, self.media.id)])

    def test_cross_workspace_association_aborts_without_mutating_original_data(self):
        cross_media = self.media.__class__.objects.create(
            workspace=self.other_workspace,
            owner=self.other_user,
            original_filename="x.txt",
            storage_path="uploads/x.txt",
            mime_type="text/plain",
            file_size=1,
            category="document",
        )
        self._insert_old_association(self.app.id, cross_media.id)

        with self.assertRaisesMessage(ValueError, "workspace mismatch"):
            self._migrate_to_target()

        # Migration is atomic; original attachment table/data must remain unchanged.
        self.assertIn(OLD_THROUGH, self._table_names())
        self.assertNotIn(TMP_THROUGH, self._table_names())
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT demoapplication_id, mediaasset_id FROM {OLD_THROUGH}"
            )
            rows = cursor.fetchall()
        self.assertEqual(rows, [(self.app.id, cross_media.id)])

    def test_missing_media_reference_aborts_without_mutating_original_data(self):
        # Simulate a genuinely orphaned legacy association (missing media reference) in a
        # test-only way: temporarily remove the old through-table FK on mediaasset_id so the
        # invalid legacy row can exist, then restore the exact constraint after cleanup.
        missing_media_id = uuid.uuid4()
        fk = self._get_media_fk_constraint(OLD_THROUGH)
        self.assertIsNotNone(fk, "Expected mediaasset_id foreign key on legacy through table")
        fk_name, fk_def = fk
        self._drop_constraint(OLD_THROUGH, fk_name)
        orphan_row_id = None
        try:
            orphan_row_id = self._insert_old_association(self.app.id, missing_media_id)

            with self.assertRaisesMessage(ValueError, "missing media reference"):
                self._migrate_to_target()

            # Migration rejection verified; original legacy table/state must remain intact.
            self.assertIn(OLD_THROUGH, self._table_names())
            self.assertNotIn(TMP_THROUGH, self._table_names())
            with connection.cursor() as cursor:
                cursor.execute(
                    f"SELECT id, demoapplication_id, mediaasset_id FROM {OLD_THROUGH}"
                )
                rows = cursor.fetchall()
            self.assertEqual(
                [(r[1], r[2]) for r in rows],
                [(self.app.id, missing_media_id)],
            )
            self.assertEqual([r[0] for r in rows], [orphan_row_id])
        finally:
            # Remove only the specific orphaned test association row (parameterized),
            # then restore the exact original FK constraint reliably.
            try:
                if orphan_row_id is not None and OLD_THROUGH in self._table_names():
                    with connection.cursor() as cursor:
                        cursor.execute(
                            f"DELETE FROM {connection.ops.quote_name(OLD_THROUGH)} WHERE id = %s",
                            [orphan_row_id],
                        )
            finally:
                existing = self._get_media_fk_constraint(OLD_THROUGH)
                if existing is None and OLD_THROUGH in self._table_names():
                    self._add_constraint(OLD_THROUGH, fk_name, fk_def)

    def test_rollback_restores_original_through_table_and_data(self):
        self._insert_old_association(self.app.id, self.media.id)
        self._migrate_to_target()

        # Roll back schema/data operations to 0010.
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(MIGRATE_FROM)

        tables = self._table_names()
        self.assertIn(OLD_THROUGH, tables)
        self.assertNotIn(TMP_THROUGH, tables)
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT demoapplication_id, mediaasset_id FROM {OLD_THROUGH}"
            )
            rows = cursor.fetchall()
        self.assertEqual(rows, [(self.app.id, self.media.id)])

        # Copied demo assets from forward migration may remain orphaned after rollback
        # (documented migration behavior; no safe inverse mapping exists).
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM demo_demomediaasset WHERE original_name = %s AND workspace_id = %s",
                ["doc.txt", self.workspace.id],
            )
            copied_count = cursor.fetchone()[0]
        self.assertGreaterEqual(copied_count, 1)
