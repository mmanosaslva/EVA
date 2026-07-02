"""
audit_pkl_privacy.py — Auditoría de privacidad de modelos ML serializados.

Verifica que los archivos .pkl en la carpeta ml_models/ no contengan
información personal identificable (PII) como user_id, email, fechas
exactas de ciclo, etc.

Uso:
    python scripts/audit_pkl_privacy.py [ruta a ml_models/]

Si no se especifica ruta, usa ml_models/ en el directorio actual.
"""

import joblib
import json
import sys
from pathlib import Path
from typing import Any


PII_PATTERNS = [
    "email",
    "user_id",
    "birth_date",
    "password",
    "token",
    "ip_address",
    "name",
    "phone",
]

ENTITY_FIELDS = [
    "start_date",
    "end_date",
    "date",
    "notes",
]


def _check_value(value: Any, path: str, findings: list[str]) -> None:
    if isinstance(value, dict):
        for key, val in value.items():
            _check_value(val, f"{path}.{key}", findings)
            if any(pattern in str(key).lower() for pattern in PII_PATTERNS):
                findings.append(f"PII_KEY: {path}.{key} = {str(val)[:100]}")
    elif isinstance(value, list):
        for i, item in enumerate(value):
            _check_value(item, f"{path}[{i}]", findings)
    elif isinstance(value, str):
        for pattern in PII_PATTERNS:
            if pattern in value.lower() and len(value) > 3:
                findings.append(f"PII_STR: {path} contiene '{pattern}' en '{value[:100]}'")


def audit_pkl(file_path: Path) -> list[str]:
    model = joblib.load(file_path)
    findings: list[str] = []

    for attr_name in dir(model):
        if attr_name.startswith("_"):
            continue
        try:
            value = getattr(model, attr_name)
            if callable(value):
                continue
            _check_value(value, f"{file_path.name}:{attr_name}", findings)
        except Exception:
            pass

    if hasattr(model, "history"):
        for key, val in model.history.items():
            if isinstance(val, (list, dict)):
                findings.append(f"HISTORY: {file_path.name} contiene history[{key}] con {len(val)} elementos")
    if hasattr(model, "train_holiday_names") and model.train_holiday_names:
        findings.append(f"HOLIDAYS: {file_path.name} contiene train_holiday_names")

    return findings


def main():
    model_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("ml_models")

    if not model_dir.exists():
        print(f"  Directorio no encontrado: {model_dir}")
        print("  No hay modelos .pkl para auditar.")
        return

    pkl_files = list(model_dir.glob("*.pkl"))
    if not pkl_files:
        print("  No se encontraron archivos .pkl en", model_dir)
        return

    print(f"Auditando {len(pkl_files)} archivo(s) .pkl en {model_dir}")
    total_findings = 0

    for pkl_file in sorted(pkl_files):
        print(f"\n  Archivo: {pkl_file.name}")
        try:
            findings = audit_pkl(pkl_file)
            if findings:
                for f in findings:
                    print(f"    [ALERTA] {f}")
                total_findings += len(findings)
            else:
                print("    OK — sin PII detectada")
        except Exception as exc:
            print(f"    ERROR al auditar: {exc}")

    print(f"\n  Total de alertas: {total_findings}")
    if total_findings == 0:
        print("  Auditoría de privacidad .pkl: APROBADA")
    else:
        print("  Auditoría de privacidad .pkl: REQUIERE REVISIÓN")


if __name__ == "__main__":
    main()
