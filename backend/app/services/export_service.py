import csv
import io
import logging
from datetime import date
from typing import Optional

from app.repositories import cycle_repo
from app.repositories.daily_log_repo import get_logs_by_cycle
from app.repositories.symptom_repo import get_symptoms_by_log
from app.services.analytics_service import get_summary, get_symptoms_analytics
from app.services.prediction_service import predict_next_cycle

logger = logging.getLogger(__name__)


async def _get_export_data(user_id: str, from_date: Optional[date] = None, to_date: Optional[date] = None):
    rows = await cycle_repo.get_cycles_by_user(user_id, limit=1000, offset=0, from_date=from_date)
    cycles = [dict(row._mapping) for row in rows]

    if to_date:
        cycles = [c for c in cycles if c["start_date"] <= to_date]

    cycles.sort(key=lambda c: c["start_date"])

    data = []
    for cycle in cycles:
        cycle_id = str(cycle["id"])
        duration = (cycle["end_date"] - cycle["start_date"]).days + 1 if cycle["end_date"] else ""
        log_rows = await get_logs_by_cycle(cycle_id)
        logs = [dict(row._mapping) for row in log_rows]

        for log_entry in logs:
            log_id = str(log_entry["id"])
            symptom_rows = await get_symptoms_by_log(log_id)
            symptoms = [dict(row._mapping) for row in symptom_rows]

            if symptoms:
                for symptom in symptoms:
                    data.append({
                        "Fecha inicio ciclo": str(cycle["start_date"]),
                        "Fecha fin ciclo": str(cycle["end_date"]) if cycle["end_date"] else "",
                        "Duracion (dias)": duration,
                        "Fecha registro": str(log_entry["date"]),
                        "Nivel flujo": log_entry.get("flow_level") or "",
                        "Temperatura": str(log_entry["temperature"]) if log_entry.get("temperature") else "",
                        "Sintoma": symptom.get("name", ""),
                        "Intensidad": symptom.get("intensity", ""),
                        "Notas": log_entry.get("notes") or "",
                    })
            else:
                data.append({
                    "Fecha inicio ciclo": str(cycle["start_date"]),
                    "Fecha fin ciclo": str(cycle["end_date"]) if cycle["end_date"] else "",
                    "Duracion (dias)": duration,
                    "Fecha registro": str(log_entry["date"]),
                    "Nivel flujo": log_entry.get("flow_level") or "",
                    "Temperatura": str(log_entry["temperature"]) if log_entry.get("temperature") else "",
                    "Sintoma": "",
                    "Intensidad": "",
                    "Notas": log_entry.get("notes") or "",
                })

    return data


async def export_csv(user_id: str, from_date: Optional[date] = None, to_date: Optional[date] = None) -> str:
    data = await _get_export_data(user_id, from_date, to_date)

    columns = [
        "Fecha inicio ciclo", "Fecha fin ciclo", "Duracion (dias)",
        "Fecha registro", "Nivel flujo", "Temperatura",
        "Sintoma", "Intensidad", "Notas",
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns)
    writer.writeheader()
    for row in data:
        writer.writerow(row)

    return output.getvalue()


async def export_pdf(user_id: str, cycles_back: int = 6) -> bytes:
    from fpdf import FPDF
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import tempfile

    summary = await get_summary(user_id)
    symptoms_result = await get_symptoms_analytics(user_id, cycles_back=cycles_back, limit=5)
    prediction_result = await predict_next_cycle(user_id)

    pdf = FPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Informe Medico - EVA", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Generado: {date.today().isoformat()}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "1. Resumen de ciclos", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Total de ciclos registrados: {summary['total_cycles']}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Duracion promedio: {summary['avg_cycle_duration']:.1f} dias", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Duracion promedio de menstruacion: {summary['avg_period_duration']:.1f} dias", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Variabilidad del ciclo: {summary['cycle_variability_days']:.1f} dias", new_x="LMARGIN", new_y="NEXT")
    if summary["shortest_cycle"] is not None:
        pdf.cell(0, 6, f"Ciclo mas corto: {summary['shortest_cycle']} dias", new_x="LMARGIN", new_y="NEXT")
    if summary["longest_cycle"] is not None:
        pdf.cell(0, 6, f"Ciclo mas largo: {summary['longest_cycle']} dias", new_x="LMARGIN", new_y="NEXT")
    if summary["last_cycle_start"]:
        pdf.cell(0, 6, f"Inicio del ultimo ciclo: {summary['last_cycle_start']}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "2. Top 5 sintomas mas frecuentes", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Ciclos analizados: {symptoms_result['cycles_analyzed']}", new_x="LMARGIN", new_y="NEXT")
    for i, symptom in enumerate(symptoms_result["symptoms"], 1):
        pdf.cell(0, 6, f"  {i}. {symptom['name']} ({symptom['category']}) - "
                  f"Frecuencia: {symptom['frequency']:.0%}, Intensidad promedio: {symptom['avg_intensity']:.1f}/5",
                  new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "3. Prediccion del proximo ciclo", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    if prediction_result["has_sufficient_data"]:
        fuente = "Prophet (ML)" if prediction_result["prediction_source"] == "prophet" else "Heuristica (promedio)"
        pdf.cell(0, 6, f"Fuente: {fuente}", new_x="LMARGIN", new_y="NEXT")
        if prediction_result["predicted_start_date"]:
            pdf.cell(0, 6, f"Fecha estimada de inicio: {prediction_result['predicted_start_date']}", new_x="LMARGIN", new_y="NEXT")
        if prediction_result["model_mae_days"] is not None:
            pdf.cell(0, 6, f"Error promedio del modelo (MAE): {prediction_result['model_mae_days']} dias", new_x="LMARGIN", new_y="NEXT")
        if prediction_result["cycles_used_for_training"]:
            pdf.cell(0, 6, f"Ciclos usados para entrenar: {prediction_result['cycles_used_for_training']}", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.cell(0, 6, "No hay suficientes datos para generar una prediccion.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    try:
        rows = await cycle_repo.get_cycles_by_user(user_id, limit=cycles_back + 1, offset=0)
        cycles_data = [dict(row._mapping) for row in rows]
        cycles_data.sort(key=lambda c: c["start_date"])
        cycles_data = cycles_data[-cycles_back:] if len(cycles_data) > cycles_back else cycles_data

        if len(cycles_data) >= 2:
            fig, ax = plt.subplots(figsize=(7, 3))
            durations = []
            labels = []
            for i in range(1, len(cycles_data)):
                prev = cycles_data[i - 1]
                curr = cycles_data[i]
                durations.append((curr["start_date"] - prev["start_date"]).days)
                labels.append(str(curr["start_date"]))

            ax.bar(range(len(durations)), durations, color="#7C4DFF")
            ax.set_xticks(range(len(durations)))
            ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=7)
            ax.set_ylabel("Dias")
            ax.set_title("Duracion de ultimos ciclos")

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                fig.savefig(tmp.name, dpi=100, bbox_inches="tight")
                plt.close(fig)
                pdf.set_font("Helvetica", "B", 13)
                pdf.cell(0, 8, "4. Grafico de duracion de ciclos", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(3)
                pdf.image(tmp.name, w=160)
                pdf.ln(3)
    except Exception as exc:
        logger.warning(f"No se pudo generar el grafico: {exc}")

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "5. Notas de registros diarios", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    rows = await cycle_repo.get_cycles_by_user(user_id, limit=cycles_back, offset=0)
    cycles = [dict(row._mapping) for row in rows]
    has_notes = False
    for cycle in cycles:
        log_rows = await get_logs_by_cycle(str(cycle["id"]))
        for log_entry in log_rows:
            log_data = dict(log_entry._mapping) if hasattr(log_entry, "_mapping") else log_entry
            if log_data.get("notes"):
                has_notes = True
                pdf.cell(0, 6, f"  {log_data['date']}: {log_data['notes'][:100]}", new_x="LMARGIN", new_y="NEXT")
    if not has_notes:
        pdf.cell(0, 6, "  No se encontraron notas en los registros recientes.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 6, "6. Disclaimer medico", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 8)
    pdf.multi_cell(0, 5,
        "EVA es una herramienta informativa de salud menstrual. "
        "No reemplaza el diagnostico, tratamiento o consejo de un profesional de la salud. "
        "Consulta siempre a tu ginecologa o medico de cabecera para interpretar estos datos. "
        "Los valores mostrados son estimaciones basadas en los datos registrados por la usuaria "
        "y pueden tener margen de error."
    )

    return bytes(pdf.output())
