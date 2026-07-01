from sqlalchemy import select, func, case, Numeric

from app.core.db import engine
from app.models.db_tables import cycles_table, daily_logs_table, daily_symptoms_table


async def get_cycles_with_features(user_id: str) -> list[dict]:
    flow_expr = case(
        (daily_logs_table.c.flow_level == "heavy", 3),
        (daily_logs_table.c.flow_level == "medium", 2),
        (daily_logs_table.c.flow_level == "light", 1),
        else_=0,
    )

    symptom_count_subq = (
        select(
            daily_symptoms_table.c.log_id,
            func.count().label("symptom_count"),
        )
        .group_by(daily_symptoms_table.c.log_id)
    ).subquery("ds_count")

    symptom_count_expr = func.coalesce(
        func.avg(
            func.case(
                (
                    daily_logs_table.c.date - cycles_table.c.start_date >= 14,
                    symptom_count_subq.c.symptom_count,
                ),
                else_=None,
            ).cast(Numeric)
        ),
        0,
    ).label("avg_symptoms_lutea")

    query = (
        select(
            cycles_table.c.start_date,
            func.coalesce(
                func.avg(flow_expr).cast(Numeric), 1.5
            ).label("avg_flow_level"),
            symptom_count_expr,
        )
        .select_from(
            cycles_table
            .outerjoin(daily_logs_table, daily_logs_table.c.cycle_id == cycles_table.c.id)
            .outerjoin(
                symptom_count_subq,
                symptom_count_subq.c.log_id == daily_logs_table.c.id,
            )
        )
        .where(cycles_table.c.user_id == user_id)
        .group_by(cycles_table.c.id, cycles_table.c.start_date, cycles_table.c.end_date)
        .order_by(cycles_table.c.start_date.asc())
    )

    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [dict(row._mapping) for row in result.fetchall()]
