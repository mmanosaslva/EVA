"""
Generate synthetic data for performance testing of analytics queries.

Usage:
    python scripts/seed_test_data.py

Connects to PostgreSQL via DATABASE_URL from .env.
Generates: 10 users, 8-15 cycles each (~100), ~500 daily_logs, ~300 daily_symptoms.
Runs EXPLAIN ANALYZE on the 4 core analytics queries.
"""

import random
import os
import sys
import uuid
from datetime import date, timedelta

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

USERS_COUNT = 10
CYCLES_PER_USER = (8, 15)
CYCLE_LENGTH_RANGE = (24, 35)
PERIOD_LENGTH_RANGE = (4, 7)
SYMPTOMS_PER_LOG = (1, 2)
USER_ID_BASE = "aaaaaaaa-bbbb-cccc-dddd-"


def random_user_id(i: int) -> str:
    return f"{USER_ID_BASE}{i:012d}"


def main() -> None:
    from psycopg2.extras import execute_values

    print("Generating synthetic data...")

    user_rows: list[tuple] = []
    cycle_rows: list[tuple] = []
    log_rows: list[tuple] = []
    symptom_rows: list[tuple] = []

    for i in range(1, USERS_COUNT + 1):
        user_id = random_user_id(i)
        user_rows.append((user_id, f"test{i}@example.com", date(1990, 1, 1)))

        count = random.randint(*CYCLES_PER_USER)
        base = date(2023, 1, 1) + timedelta(days=random.randint(0, 365))
        current = base

        for _ in range(count):
            duration = random.randint(*CYCLE_LENGTH_RANGE)
            period = random.randint(*PERIOD_LENGTH_RANGE)
            end_date = current + timedelta(days=period - 1)
            cycle_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}-{current.isoformat()}"))

            cycle_rows.append((cycle_id, user_id, current, end_date))

            for day_offset in range(period):
                log_date = current + timedelta(days=day_offset)
                log_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{cycle_id}-{log_date.isoformat()}"))
                flow = random.choice(["light", "medium", "heavy"])
                temp = round(random.uniform(36.1, 37.2), 2) if random.random() > 0.3 else None

                log_rows.append((log_id, cycle_id, log_date, flow, temp))

                for _ in range(random.randint(*SYMPTOMS_PER_LOG)):
                    symptom_rows.append((log_id, random.randint(1, 30), random.randint(1, 5)))

            current = current + timedelta(days=duration)

    print(f"  Users: {len(user_rows)}")
    print(f"  Cycles: {len(cycle_rows)}")
    print(f"  Daily logs: {len(log_rows)}")
    print(f"  Daily symptoms: {len(symptom_rows)}")
    print()

    import psycopg2
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Inserting...")
    execute_values(cur, "INSERT INTO users (id, email, birth_date) VALUES %s ON CONFLICT DO NOTHING", user_rows, page_size=100)
    conn.commit()
    print(f"  {len(user_rows)} users OK")

    execute_values(cur, "INSERT INTO cycles (id, user_id, start_date, end_date) VALUES %s ON CONFLICT DO NOTHING", cycle_rows, page_size=100)
    conn.commit()
    print(f"  {len(cycle_rows)} cycles OK")

    execute_values(cur, "INSERT INTO daily_logs (id, cycle_id, date, flow_level, temperature) VALUES %s ON CONFLICT DO NOTHING", log_rows, page_size=100)
    conn.commit()
    print(f"  {len(log_rows)} logs OK")

    execute_values(cur, "INSERT INTO daily_symptoms (log_id, symptom_id, intensity) VALUES %s ON CONFLICT DO NOTHING", symptom_rows, page_size=100)
    conn.commit()
    print(f"  {len(symptom_rows)} symptoms OK")

    cur.close()
    conn.close()

    print()
    print("Running EXPLAIN ANALYZE...")
    print("=" * 70)

    test_user_id = random_user_id(1)

    from sqlalchemy import create_engine, text
    url = DATABASE_URL
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    engine = create_engine(url, echo=False, connect_args={"connect_timeout": 15})

    with engine.connect() as conn:
        print("\n--- Q1: get_cycle_stats (LEAD window + aggregation) ---")
        r = conn.execute(text("""
            EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
            WITH cycle_durations AS (
                SELECT start_date,
                       (LEAD(start_date) OVER (
                           PARTITION BY user_id ORDER BY start_date
                       ) - start_date)::int AS duration
                FROM cycles
                WHERE user_id = :uid
            )
            SELECT count(*) AS total_cycles,
                   coalesce(round(avg(duration), 1), 0) AS avg_duration,
                   coalesce(round(stddev_pop(duration), 1), 0) AS variability,
                   min(duration) AS shortest,
                   max(duration) AS longest,
                   max(start_date) AS last_start
            FROM cycle_durations
            WHERE duration IS NOT NULL
        """), {"uid": test_user_id})
        for row in r.fetchall():
            print(row[0])

        print("\n--- Q2: get_bleeding_days_per_cycle ---")
        r = conn.execute(text("""
            EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
            SELECT c.id AS cycle_id, COUNT(*) AS days
            FROM daily_logs dl
            JOIN cycles c ON dl.cycle_id = c.id
            WHERE c.user_id = :uid
              AND dl.flow_level IN ('light', 'medium', 'heavy')
            GROUP BY c.id
        """), {"uid": test_user_id})
        for row in r.fetchall():
            print(row[0])

        print("\n--- Q3: get_symptom_frequencies ---")
        r = conn.execute(text("""
            EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
            SELECT sc.id AS symptom_id, sc.name, sc.category,
                   COUNT(ds.symptom_id) AS occurrences,
                   ROUND(AVG(ds.intensity::numeric), 2) AS avg_intensity
            FROM daily_symptoms ds
            JOIN daily_logs dl ON ds.log_id = dl.id
            JOIN symptoms_catalog sc ON ds.symptom_id = sc.id
            WHERE dl.cycle_id IN (
                SELECT id FROM cycles WHERE user_id = :uid
                ORDER BY start_date DESC LIMIT 3
            )
            GROUP BY sc.id, sc.name, sc.category
            ORDER BY COUNT(ds.symptom_id) DESC
            LIMIT 10
        """), {"uid": test_user_id})
        for row in r.fetchall():
            print(row[0])

        print("\n--- Q4: get_flow_distribution ---")
        r = conn.execute(text("""
            EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
            SELECT
                CASE
                    WHEN (dl.date - c.start_date + 1) BETWEEN 1 AND 5 THEN 'menstruacion'
                    WHEN (dl.date - c.start_date + 1) BETWEEN 6 AND 13 THEN 'folicular'
                    WHEN (dl.date - c.start_date + 1) BETWEEN 14 AND 16 THEN 'ovulacion'
                    ELSE 'lutea'
                END AS phase,
                COALESCE(dl.flow_level, 'none') AS flow_level,
                COUNT(*) AS count
            FROM daily_logs dl
            JOIN cycles c ON dl.cycle_id = c.id
            WHERE c.user_id = :uid
            GROUP BY phase, dl.flow_level
            ORDER BY phase, dl.flow_level
        """), {"uid": test_user_id})
        for row in r.fetchall():
            print(row[0])

    engine.dispose()
    print()
    print("=" * 70)
    print("Done.")


if __name__ == "__main__":
    main()
