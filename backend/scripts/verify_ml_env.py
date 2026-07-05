"""Verifica que el entorno local de ML esté correctamente configurado."""

import importlib
import json
import sys
from pathlib import Path
from urllib.request import urlopen


REQUIRED_PACKAGES = {
    "prophet": "Prophet",
    "joblib": None,
    "sklearn": "scikit-learn",
    "pandas": None,
    "numpy": None,
}

RECOMMENDED_PACKAGES = {
    "httpx": None,
}


def check_import(module_name: str, pypi_name: str | None = None) -> bool:
    try:
        mod = importlib.import_module(module_name)
        version = getattr(mod, "__version__", "unknown")
        label = pypi_name or module_name
        print(f"  [OK] {label} == {version}")
        return True
    except ImportError as e:
        label = pypi_name or module_name
        print(f"  [FAIL] {label} — {e}")
        return False


def check_prophet() -> bool:
    try:
        from prophet import Prophet

        m = Prophet()
        print(f"  [OK] prophet == {Prophet.__module__}")
        print(f"        Prophet() created successfully")
        return True
    except Exception as e:
        print(f"  [FAIL] prophet — {e}")
        return False


def check_sklearn_metric() -> bool:
    try:
        from sklearn.metrics import mean_absolute_error

        y_true = [28, 30, 27]
        y_pred = [27, 31, 27]
        mae = mean_absolute_error(y_true, y_pred)
        print(f"  [OK] sklearn.metrics.mean_absolute_error (sample MAE={mae:.2f})")
        return True
    except Exception as e:
        print(f"  [FAIL] sklearn.metrics — {e}")
        return False


def check_joblib() -> bool:
    try:
        import joblib
        import os
        import tempfile

        data = {"test": [1, 2, 3]}
        pid = os.getpid()
        p = Path(tempfile.gettempdir()) / f"_eva_joblib_test_{pid}.pkl"
        try:
            joblib.dump(data, p)
            loaded = joblib.load(p)
            assert loaded == data, "joblib roundtrip failed"
            print(f"  [OK] joblib == {joblib.__version__} (serialization OK)")
            return True
        finally:
            if p.exists():
                p.unlink()
    except Exception as e:
        print(f"  [FAIL] joblib — {e}")
        return False


def check_ollama() -> bool:
    try:
        response = urlopen("http://localhost:11434/api/tags", timeout=5)
        if response.status == 200:
            data = json.loads(response.read().decode())
            models = [m["name"] for m in data.get("models", [])]
            has_mistral = any("mistral" in m for m in models)
            if has_mistral:
                print(f"  [OK] Ollama disponible. Modelos: {models}")
            else:
                print(f"  [WARN] Ollama disponible pero mistral no cargado. Modelos: {models}")
            return True
        else:
            print(f"  [WARN] Ollama respondio con status {response.status}")
            return False
    except Exception as e:
        reason = str(e)
        if "No connection" in reason or "Connection refused" in reason:
            print("  [WARN] Ollama no esta corriendo. Ejecuta: ollama serve")
        elif "Name or service not known" in reason:
            print("  [WARN] Ollama no encontrado. Descarga: https://ollama.ai")
        else:
            print(f"  [WARN] Ollama no responde — {reason}")
        return False


def main():
    print("=" * 50)
    print("  EVA — Verificación del Entorno ML")
    print("=" * 50)

    print(f"\nPython: {sys.version.split()[0]}")
    print(f"Plataforma: {sys.platform}")

    print("\n--- Dependencias obligatorias ---")
    results = {}
    for mod, pip_name in REQUIRED_PACKAGES.items():
        results[mod] = check_import(mod, pip_name)

    print("\n--- Verificación específica Prophet ---")
    results["prophet_smoke"] = check_prophet()

    print("\n--- Verificación sklearn MAE ---")
    results["sklearn_mae"] = check_sklearn_metric()

    print("\n--- Verificación joblib (serialización .pkl) ---")
    results["joblib_pkl"] = check_joblib()

    print("\n--- Dependencias recomendadas ---")
    for mod, pip_name in RECOMMENDED_PACKAGES.items():
        check_import(mod, pip_name)

    print("\n--- Ollama ---")
    check_ollama()

    print("\n" + "=" * 50)
    failed = [k for k, v in results.items() if not v]
    if failed:
        print(f"  ALGUNAS VERIFICACIONES FALLARON: {failed}")
        sys.exit(1)
    else:
        print("  TODO OK — Entorno ML listo para desarrollo.")
        sys.exit(0)


if __name__ == "__main__":
    main()
