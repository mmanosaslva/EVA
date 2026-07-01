"""initial_schema

Revision ID: 001
Revises:
Create Date: 2025-06-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "cycles",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("end_date IS NULL OR end_date >= start_date", name="chk_cycle_dates"),
        sa.UniqueConstraint("user_id", "start_date", name="uq_cycle_user_start"),
    )
    op.create_index("idx_cycles_user_date", "cycles", ["user_id", sa.text("start_date DESC")])

    op.create_table(
        "daily_logs",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("cycle_id", sa.UUID(), sa.ForeignKey("cycles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("flow_level", sa.String(10), nullable=True),
        sa.Column("temperature", sa.Numeric(4, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("flow_level IN ('none', 'light', 'medium', 'heavy')", name="chk_flow_level"),
        sa.CheckConstraint("temperature IS NULL OR (temperature >= 35.0 AND temperature <= 42.0)", name="chk_temperature"),
        sa.UniqueConstraint("cycle_id", "date", name="uq_log_cycle_date"),
    )
    op.create_index("idx_daily_logs_cycle", "daily_logs", ["cycle_id", "date"])

    op.create_table(
        "symptoms_catalog",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("common_phase", sa.String(20), nullable=True),
        sa.CheckConstraint("category IN ('fisica', 'emocional', 'digestiva', 'otra')", name="chk_symptom_category"),
        sa.CheckConstraint("common_phase IN ('menstruacion', 'folicular', 'ovulacion', 'lutea', 'todas') OR common_phase IS NULL", name="chk_common_phase"),
    )

    op.create_table(
        "daily_symptoms",
        sa.Column("log_id", sa.UUID(), sa.ForeignKey("daily_logs.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("symptom_id", sa.Integer(), sa.ForeignKey("symptoms_catalog.id"), primary_key=True),
        sa.Column("intensity", sa.SmallInteger(), nullable=False),
        sa.CheckConstraint("intensity BETWEEN 1 AND 5", name="chk_symptom_intensity"),
    )
    op.create_index("idx_daily_symptoms_log", "daily_symptoms", ["log_id"])
    op.create_index("idx_daily_symptoms_symptom", "daily_symptoms", ["symptom_id"])

    op.create_table(
        "ml_models",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("model_path", sa.Text(), nullable=False),
        sa.Column("mae", sa.Numeric(5, 3), nullable=True),
        sa.Column("cycles_used", sa.Integer(), nullable=True),
        sa.Column("trained_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
    )
    op.create_index("idx_ml_models_user", "ml_models", ["user_id"])

    op.create_table(
        "llm_insights",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("insight", sa.Text(), nullable=False),
        sa.Column("phase", sa.String(20), nullable=True),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_llm_insights_user_date", "llm_insights", ["user_id", sa.text("created_at DESC")])

    op.create_table(
        "sync_operations",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.String(100), unique=True, nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'applied'")),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("type IN ('CREATE_CYCLE', 'UPDATE_CYCLE', 'DELETE_CYCLE', 'CREATE_DAILY_LOG', 'UPDATE_DAILY_LOG', 'DELETE_DAILY_LOG')", name="chk_sync_type"),
        sa.CheckConstraint("status IN ('applied', 'skipped', 'failed')", name="chk_sync_status"),
    )


def downgrade() -> None:
    op.drop_table("sync_operations")
    op.drop_table("llm_insights")
    op.drop_table("ml_models")
    op.drop_table("daily_symptoms")
    op.drop_table("symptoms_catalog")
    op.drop_table("daily_logs")
    op.drop_table("cycles")
    op.drop_table("users")
