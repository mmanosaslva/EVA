from sqlalchemy import (
    Table, Column, MetaData, UUID, String, Date, DateTime,
    SmallInteger, Text, Numeric, Boolean, Integer,
    ForeignKey, UniqueConstraint, CheckConstraint, Index,
    func,
)

metadata = MetaData()

users_table = Table(
    "users", metadata,
    Column("id", UUID, primary_key=True, server_default=func.gen_random_uuid()),
    Column("email", String(255), unique=True, nullable=False),
    Column("birth_date", Date),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

cycles_table = Table(
    "cycles", metadata,
    Column("id", UUID, primary_key=True, server_default=func.gen_random_uuid()),
    Column("user_id", UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("start_date", Date, nullable=False),
    Column("end_date", Date),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("end_date IS NULL OR end_date >= start_date", name="chk_cycle_dates"),
    UniqueConstraint("user_id", "start_date", name="uq_cycle_user_start"),
    Index("idx_cycles_user_date", "user_id", "start_date", postgresql_using="btree"),
)

daily_logs_table = Table(
    "daily_logs", metadata,
    Column("id", UUID, primary_key=True, server_default=func.gen_random_uuid()),
    Column("cycle_id", UUID, ForeignKey("cycles.id", ondelete="CASCADE"), nullable=False),
    Column("date", Date, nullable=False),
    Column("flow_level", String(10)),
    Column("temperature", Numeric(4, 2)),
    Column("notes", Text),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("flow_level IN ('none', 'light', 'medium', 'heavy')", name="chk_flow_level"),
    CheckConstraint("temperature IS NULL OR (temperature >= 35.0 AND temperature <= 42.0)", name="chk_temperature"),
    UniqueConstraint("cycle_id", "date", name="uq_log_cycle_date"),
    Index("idx_daily_logs_cycle_flow", "cycle_id", "flow_level", postgresql_using="btree"),
)

symptoms_catalog_table = Table(
    "symptoms_catalog", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(100), unique=True, nullable=False),
    Column("category", String(20), nullable=False),
    Column("common_phase", String(20)),
    CheckConstraint("category IN ('fisica', 'emocional', 'digestiva', 'otra')", name="chk_symptom_category"),
    CheckConstraint("common_phase IN ('menstruacion', 'folicular', 'ovulacion', 'lutea', 'todas') OR common_phase IS NULL", name="chk_common_phase"),
)

daily_symptoms_table = Table(
    "daily_symptoms", metadata,
    Column("log_id", UUID, ForeignKey("daily_logs.id", ondelete="CASCADE"), primary_key=True),
    Column("symptom_id", Integer, ForeignKey("symptoms_catalog.id"), primary_key=True),
    Column("intensity", SmallInteger, nullable=False),
    CheckConstraint("intensity BETWEEN 1 AND 5", name="chk_symptom_intensity"),
    Index("idx_daily_symptoms_symptom", "symptom_id"),
)

ml_models_table = Table(
    "ml_models", metadata,
    Column("id", UUID, primary_key=True, server_default=func.gen_random_uuid()),
    Column("user_id", UUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
    Column("model_path", Text, nullable=False),
    Column("mae", Numeric(5, 3)),
    Column("cycles_used", Integer),
    Column("trained_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("is_active", Boolean, nullable=False, server_default=func.true()),
    Index("idx_ml_models_user", "user_id"),
)

llm_insights_table = Table(
    "llm_insights", metadata,
    Column("id", UUID, primary_key=True, server_default=func.gen_random_uuid()),
    Column("user_id", UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("question", Text, nullable=False),
    Column("insight", Text, nullable=False),
    Column("phase", String(20)),
    Column("source", String(50), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Index("idx_llm_insights_user_date", "user_id", "created_at", postgresql_using="btree"),
)

sync_operations_table = Table(
    "sync_operations", metadata,
    Column("id", UUID, primary_key=True, server_default=func.gen_random_uuid()),
    Column("user_id", UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("client_id", String(100), unique=True, nullable=False),
    Column("type", String(30), nullable=False),
    Column("payload", Text, nullable=False),
    Column("status", String(20), nullable=False, server_default=func.text("'applied'")),
    Column("server_id", String(36), nullable=True),
    Column("applied_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("type IN ('CREATE_CYCLE', 'UPDATE_CYCLE', 'DELETE_CYCLE', 'CREATE_DAILY_LOG', 'UPDATE_DAILY_LOG', 'DELETE_DAILY_LOG')", name="chk_sync_type"),
    CheckConstraint("status IN ('applied', 'skipped', 'failed')", name="chk_sync_status"),
)
