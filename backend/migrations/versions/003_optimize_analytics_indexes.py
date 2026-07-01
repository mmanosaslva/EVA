"""optimize analytics indexes

Revision ID: 003
Revises: 002
Create Date: 2025-07-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # DROP redundant indexes
    # idx_daily_logs_cycle is redundant with unique constraint uq_log_cycle_date (cycle_id, date)
    op.drop_index("idx_daily_logs_cycle", table_name="daily_logs")
    # idx_daily_symptoms_log is redundant with PK (log_id, symptom_id)
    op.drop_index("idx_daily_symptoms_log", table_name="daily_symptoms")

    # NEW composite index for get_bleeding_days_per_cycle
    # Covers: WHERE cycle_id = ? AND flow_level IN (?, ?, ?)
    op.create_index(
        "idx_daily_logs_cycle_flow",
        "daily_logs",
        ["cycle_id", "flow_level"],
        postgresql_using="btree",
    )


def downgrade() -> None:
    op.drop_index("idx_daily_logs_cycle_flow", table_name="daily_logs")
    op.create_index("idx_daily_symptoms_log", "daily_symptoms", ["log_id"])
    op.create_index(
        "idx_daily_logs_cycle", "daily_logs", ["cycle_id", sa.text("date")]
    )
