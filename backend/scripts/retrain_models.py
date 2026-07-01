"""Reentrena modelos Prophet para usuarias con datos nuevos.

Ejecutado por Render como cron job a las 03:00 UTC.
Uso: python scripts/retrain_models.py
"""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.repositories.user_repo import get_users_with_new_cycles
from app.services.ml_service import train_model
from app.repositories.cycle_repo import get_cycles_with_features
from app.repositories.ml_repo import upsert_ml_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("retrain_models")


async def retrain_all():
    logger.info("Iniciando reentrenamiento nocturno de modelos ML...")

    users_to_retrain = await get_users_with_new_cycles()
    results = {"trained": 0, "skipped": 0, "failed": 0}

    for user in users_to_retrain:
        try:
            cycles_data = await get_cycles_with_features(user.id)
            if len(cycles_data) < 3:
                results["skipped"] += 1
                continue

            model_info = train_model(user.id, cycles_data)
            await upsert_ml_model(user.id, model_info)
            results["trained"] += 1

        except Exception as e:
            logger.error(f"Error reentrenando usuario {user.id[:8]}: {e}")
            results["failed"] += 1

    logger.info(
        f"Reentrenamiento completado: "
        f"{results['trained']} entrenados, "
        f"{results['skipped']} saltados, "
        f"{results['failed']} fallidos"
    )


if __name__ == "__main__":
    asyncio.run(retrain_all())
