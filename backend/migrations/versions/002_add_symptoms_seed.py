"""add_symptoms_seed

Revision ID: 002
Revises: 001
Create Date: 2025-06-30

Seed del catalogo de 30 sintomas predefinidos.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SYMPTOMS = [
    # Fisicos — menstruacion y lutea
    ("Dolor abdominal (colicos)", "fisica", "menstruacion"),
    ("Dolor lumbar", "fisica", "menstruacion"),
    ("Dolor de cabeza / migrana", "fisica", "lutea"),
    ("Fatiga", "fisica", "lutea"),
    ("Sensibilidad mamaria", "fisica", "lutea"),
    ("Hinchazon corporal", "digestiva", "lutea"),
    ("Calambres en piernas", "fisica", "menstruacion"),
    ("Acne / brotes en piel", "fisica", "lutea"),
    ("Temperatura basal elevada", "fisica", "lutea"),
    ("Insomnio / sueno alterado", "fisica", "lutea"),
    ("Energia alta", "fisica", "folicular"),
    ("Piel radiante", "fisica", "folicular"),
    ("Dolor ovulatorio (Mittelschmerz)", "fisica", "ovulacion"),
    ("Flujo abundante", "fisica", "ovulacion"),
    ("Sofocos", "fisica", "todas"),
    # Digestivos
    ("Nauseas", "digestiva", "menstruacion"),
    ("Antojos de comida", "digestiva", "lutea"),
    ("Estrinimiento", "digestiva", "lutea"),
    ("Diarrea", "digestiva", "menstruacion"),
    ("Gases / distension", "digestiva", "lutea"),
    # Emocionales
    ("Irritabilidad", "emocional", "lutea"),
    ("Ansiedad", "emocional", "lutea"),
    ("Tristeza / llanto facil", "emocional", "lutea"),
    ("Cambios de humor bruscos", "emocional", "lutea"),
    ("Dificultad de concentracion", "emocional", "lutea"),
    ("Baja libido", "emocional", "lutea"),
    ("Libido alta", "emocional", "ovulacion"),
    ("Motivacion / claridad mental", "emocional", "folicular"),
    ("Sensacion de bienestar", "emocional", "folicular"),
    ("Aislamiento social", "emocional", "lutea"),
]


def upgrade() -> None:
    symptoms_catalog = sa.table(
        "symptoms_catalog",
        sa.column("name", sa.String),
        sa.column("category", sa.String),
        sa.column("common_phase", sa.String),
    )
    op.bulk_insert(
        symptoms_catalog,
        [
            {"name": name, "category": category, "common_phase": phase}
            for name, category, phase in SYMPTOMS
        ],
    )


def downgrade() -> None:
    symptoms_catalog = sa.table("symptoms_catalog", sa.column("name", sa.String))
    names = [s[0] for s in SYMPTOMS]
    op.execute(
        symptoms_catalog.delete().where(symptoms_catalog.c.name.in_(names))
    )
