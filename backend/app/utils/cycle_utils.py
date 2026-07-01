from datetime import date
from typing import Optional


def calculate_current_phase(last_cycle: Optional[dict]) -> tuple[Optional[str], Optional[int]]:
    if last_cycle is None or last_cycle.get("start_date") is None:
        return None, None

    today = date.today()
    cycle_start = last_cycle["start_date"]
    cycle_end = last_cycle.get("end_date")

    if isinstance(cycle_start, str):
        from datetime import datetime
        cycle_start = datetime.strptime(cycle_start, "%Y-%m-%d").date()
    if isinstance(cycle_end, str):
        from datetime import datetime
        cycle_end = datetime.strptime(cycle_end, "%Y-%m-%d").date()
    if isinstance(today, str):
        from datetime import datetime
        today = datetime.strptime(today, "%Y-%m-%d").date()

    day_of_cycle = (today - cycle_start).days + 1

    if day_of_cycle < 1:
        return None, None

    if cycle_end and today <= cycle_end:
        return "menstruacion", day_of_cycle

    if 1 <= day_of_cycle <= 5:
        return "menstruacion", day_of_cycle
    elif 6 <= day_of_cycle <= 13:
        return "folicular", day_of_cycle
    elif 14 <= day_of_cycle <= 16:
        return "ovulacion", day_of_cycle
    else:
        return "lutea", day_of_cycle
