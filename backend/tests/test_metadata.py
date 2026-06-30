"""
SQLite-compatible table definitions for integration tests.

Reemplaza UUID -> String(36) y server_defaults de PostgreSQL
por equivalents que funcionan en SQLite.  Esto permite que los tests
de integración corran contra SQLite in-memory en vez de depender de
PostgreSQL real.

Motivación:
  - Las tablas reales (app.models.db_tables) usan:
      * Column("id", UUID, server_default=func.gen_random_uuid())
      * Column("user_id", UUID, ...)
    lo cual solo funciona con PostgreSQL + asyncpg.
  - Esta copia usa String(36) + hex(randomblob) para SQLite.
  - Solo incluye las tablas necesarias para cycle_service; si en el
    futuro se necesitan más, se agregan acá (misma mecánica).
"""

from sqlalchemy import (
    Table, Column, MetaData, String, Date, DateTime,
    SmallInteger, Text, Numeric, Boolean, Integer,
    ForeignKey, UniqueConstraint, CheckConstraint, Index,
    func, text,
)

test_metadata = MetaData()

cycles_table = Table(
    "cycles", test_metadata,
    Column("id", String(36), primary_key=True,
           server_default=text(
               "(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || "
               "hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))))"
           )),
    Column("user_id", String(36), nullable=False),
    Column("start_date", Date, nullable=False),
    Column("end_date", Date),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("end_date IS NULL OR end_date >= start_date", name="chk_cycle_dates"),
    UniqueConstraint("user_id", "start_date", name="uq_cycle_user_start"),
    Index("idx_cycles_user_date", "user_id", "start_date"),
)

daily_logs_table = Table(
    "daily_logs", test_metadata,
    Column("id", String(36), primary_key=True,
           server_default=text(
               "(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || "
               "hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))))"
           )),
    Column("cycle_id", String(36), nullable=False),
    Column("date", Date, nullable=False),
    Column("flow_level", String(10)),
    Column("temperature", Numeric(4, 2)),
    Column("notes", Text),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("flow_level IN ('none', 'light', 'medium', 'heavy')", name="chk_flow_level"),
    CheckConstraint("temperature IS NULL OR (temperature >= 35.0 AND temperature <= 42.0)", name="chk_temperature"),
    UniqueConstraint("cycle_id", "date", name="uq_log_cycle_date"),
    Index("idx_daily_logs_cycle", "cycle_id", "date"),
)

symptoms_catalog_table = Table(
    "symptoms_catalog", test_metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(100), unique=True, nullable=False),
    Column("category", String(20), nullable=False),
    Column("common_phase", String(20)),
    CheckConstraint("category IN ('fisica', 'emocional', 'digestiva', 'otra')", name="chk_symptom_category"),
    CheckConstraint("common_phase IN ('menstruacion', 'folicular', 'ovulacion', 'lutea', 'todas') OR common_phase IS NULL", name="chk_common_phase"),
)

daily_symptoms_table = Table(
    "daily_symptoms", test_metadata,
    Column("log_id", String(36), primary_key=True),
    Column("symptom_id", Integer, primary_key=True),
    Column("intensity", SmallInteger, nullable=False),
    CheckConstraint("intensity BETWEEN 1 AND 5", name="chk_symptom_intensity"),
    Index("idx_daily_symptoms_log", "log_id"),
    Index("idx_daily_symptoms_symptom", "symptom_id"),
)
