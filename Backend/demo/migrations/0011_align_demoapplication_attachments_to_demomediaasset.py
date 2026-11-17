from django.db import migrations, models


OLD_THROUGH = "demo_demoapplication_attachments"
TMP_THROUGH = "demo_demoapplication_attachments_old_media"


def forwards(apps, schema_editor):
    """
    Migrate existing DemoApplication attachment associations from media.MediaAsset
    (UUID PK) to demo.DemoMediaAsset (bigint PK) without UUID->bigint casting.

    Safety/validation (before any data mutation):
      - For every existing association, referenced media.MediaAsset must exist and
        media.MediaAsset.workspace_id must match DemoApplication.workspace_id.
      - If any association is missing its media reference or has a workspace
        mismatch, abort with a clear, non-sensitive error (no silent skipping).

    Preservation:
      - All valid associations and their metadata are preserved by copying each
        distinct referenced media asset into a demo.DemoMediaAsset in the same
        workspace and relinking the original (application, attachment) pairs to the
        copied demo assets in the recreated through table.
      - The original through table is retained as TMP_THROUGH (not dropped) so the
        migration can reverse schema changes and restore original associations.

    Rollback note:
      - Schema/table restoration is supported (TMP_THROUGH renamed back). Copied
        demo.DemoMediaAsset records created during forward migration may remain as
        orphaned records after rollback because no safe inverse mapping exists.
    """
    connection = schema_editor.connection
    qn = schema_editor.quote_name
    demo_media_t = qn("demo_demomediaasset")
    media_t = qn("media_mediaasset")
    app_t = qn("demo_demoapplication")

    with connection.cursor() as cursor:
        tables = set(connection.introspection.table_names(cursor))
        if TMP_THROUGH not in tables and OLD_THROUGH not in tables:
            return
        source_name = TMP_THROUGH if TMP_THROUGH in tables else OLD_THROUGH
        source_q = qn(source_name)

        cursor.execute(
            f"SELECT id, demoapplication_id, mediaasset_id FROM {source_q} ORDER BY id"  # nosec B608: identifiers are quoted and values use database parameters.
        )
        rows = cursor.fetchall()
        if not rows:
            return

        # Validate all associations before mutating any data.
        app_ids = {r[1] for r in rows if r[1] is not None}
        media_ids = [r[2] for r in rows if r[2] is not None]

        app_ws = {}
        if app_ids:
            app_placeholders = ",".join(["%s"] * len(app_ids))
            cursor.execute(
                f"SELECT id, workspace_id FROM {app_t} WHERE id IN ({app_placeholders})",  # nosec B608: identifiers are quoted and values use database parameters.
                list(app_ids),
            )
            app_ws = {r[0]: r[1] for r in cursor.fetchall()}

        media_by_id = {}
        if media_ids:
            media_placeholders = ",".join(["%s"] * len(media_ids))
            cursor.execute(
                f"SELECT id, workspace_id, storage_path, original_filename, mime_type, "
                f"file_size, alt_text, description FROM {media_t} "
                f"WHERE id IN ({media_placeholders})",  # nosec B608: identifiers are quoted and values use database parameters.
                media_ids,
            )
            media_by_id = {str(m[0]): m for m in cursor.fetchall()}

        invalid = 0
        for _old_id, app_id, media_id in rows:
            if app_id is None or media_id is None or app_id not in app_ws:
                invalid += 1
                continue
            m = media_by_id.get(str(media_id))
            if not m or m[1] != app_ws[app_id]:
                # Missing media reference or cross-workspace association.
                invalid += 1
        if invalid:
            raise ValueError(
                "Cannot migrate demo application attachments: invalid attachment association(s) "
                "detected (missing media reference or workspace mismatch). Aborting to prevent "
                "unsafe or partial data changes."
            )

        # Map each distinct referenced media UUID to a newly copied demo media bigint ID.
        old_to_new = {}
        for _old_id, _app_id, media_id in rows:
            key = str(media_id)
            if key in old_to_new:
                continue
            m = media_by_id[key]
            _mid, workspace_id, storage_path, original_filename, mime_type, file_size, alt_text, description = m
            if connection.vendor == "postgresql":
                cursor.execute(
                    f"INSERT INTO {demo_media_t} "
                    "(created_at, updated_at, workspace_id, file, original_name, mime_type, size, alt_text, description, folder) "
                    "VALUES (NOW(), NOW(), %s, %s, %s, %s, %s, %s, %s, %s) "
                    "RETURNING id",  # nosec B608: identifiers are quoted and values use database parameters.
                    [
                        workspace_id,
                        storage_path or "",
                        original_filename or "",
                        mime_type or "",
                        file_size or 0,
                        alt_text or "",
                        description or "",
                        "",
                    ],
                )
                new_id = cursor.fetchone()[0]
            else:
                cursor.execute(
                    f"INSERT INTO {demo_media_t} "
                    "(created_at, updated_at, workspace_id, file, original_name, mime_type, size, alt_text, description, folder) "
                    "VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s, %s, %s, %s, %s, %s, %s, %s)",  # nosec B608: identifiers are quoted and values use database parameters.
                    [
                        workspace_id,
                        storage_path or "",
                        original_filename or "",
                        mime_type or "",
                        file_size or 0,
                        alt_text or "",
                        description or "",
                        "",
                    ],
                )
                new_id = cursor.lastrowid
            old_to_new[key] = new_id

        # Recreate all valid associations in the new through table (preserve pairs, dedupe duplicates).
        new_through = qn(OLD_THROUGH)
        seen = set()
        for _old_id, app_id, media_id in rows:
            new_media_id = old_to_new[str(media_id)]
            pair = (app_id, new_media_id)
            if pair in seen:
                continue
            seen.add(pair)
            cursor.execute(
                f"INSERT INTO {new_through} (demoapplication_id, demomediaasset_id) VALUES (%s, %s)",  # nosec B608: identifiers are quoted and values use database parameters.
                [app_id, new_media_id],
            )


def backwards(apps, schema_editor):
    # Original through-table rows remain preserved in TMP_THROUGH so schema reversal
    # can restore them. Copied demo.DemoMediaAsset records inserted during forward
    # migration may remain orphaned after rollback (no safe inverse UUID mapping).
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('demo', '0010_correct_booking_overlap_constraint'),
        ('media', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=f"ALTER TABLE {OLD_THROUGH} RENAME TO {TMP_THROUGH};",
                    reverse_sql=f"ALTER TABLE {TMP_THROUGH} RENAME TO {OLD_THROUGH};",
                ),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='demoapplication',
                    name='attachments',
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        f"CREATE TABLE {OLD_THROUGH} ("
                        "id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, "
                        "demoapplication_id bigint NOT NULL, "
                        "demomediaasset_id bigint NOT NULL"
                        ");"
                    ),
                    reverse_sql=f"DROP TABLE IF EXISTS {OLD_THROUGH};",
                ),
                migrations.RunSQL(
                    sql=(
                        f"ALTER TABLE {OLD_THROUGH} "
                        "ADD CONSTRAINT demo_demoapplication_attachments_application_fk "
                        "FOREIGN KEY (demoapplication_id) REFERENCES demo_demoapplication(id) "
                        "DEFERRABLE INITIALLY DEFERRED;"
                    ),
                    reverse_sql=f"ALTER TABLE {OLD_THROUGH} DROP CONSTRAINT IF EXISTS demo_demoapplication_attachments_application_fk;",
                ),
                migrations.RunSQL(
                    sql=(
                        f"ALTER TABLE {OLD_THROUGH} "
                        "ADD CONSTRAINT demo_demoapplication_attachments_demomediaasset_fk "
                        "FOREIGN KEY (demomediaasset_id) REFERENCES demo_demomediaasset(id) "
                        "DEFERRABLE INITIALLY DEFERRED;"
                    ),
                    reverse_sql=f"ALTER TABLE {OLD_THROUGH} DROP CONSTRAINT IF EXISTS demo_demoapplication_attachments_demomediaasset_fk;",
                ),
                migrations.RunSQL(
                    sql=(
                        f"ALTER TABLE {OLD_THROUGH} "
                        "ADD CONSTRAINT demo_demoapplication_attachments_unique "
                        "UNIQUE (demoapplication_id, demomediaasset_id);"
                    ),
                    reverse_sql=f"ALTER TABLE {OLD_THROUGH} DROP CONSTRAINT IF EXISTS demo_demoapplication_attachments_unique;",
                ),
                migrations.RunSQL(
                    sql=f"CREATE INDEX demo_demoapplication_attachments_application_id_idx ON {OLD_THROUGH} (demoapplication_id);",
                    reverse_sql=f"DROP INDEX IF EXISTS demo_demoapplication_attachments_application_id_idx;",
                ),
                migrations.RunSQL(
                    sql=f"CREATE INDEX demo_demoapplication_attachments_demomediaasset_id_idx ON {OLD_THROUGH} (demomediaasset_id);",
                    reverse_sql=f"DROP INDEX IF EXISTS demo_demoapplication_attachments_demomediaasset_id_idx;",
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='demoapplication',
                    name='attachments',
                    field=models.ManyToManyField(blank=True, related_name='application_attachments', to='demo.demomediaasset'),
                ),
            ],
        ),
        migrations.RunPython(forwards, backwards),
        # Original through table (TMP_THROUGH) is intentionally preserved to allow
        # schema/data restoration on rollback. Forward migration does not drop it.
    ]
