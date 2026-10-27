# Evaluación de métodos de predicción (T24)

**Fecha:** 2026-10-27 · **Cierra:** DP-15, DP-40 (la parte del cron) · **Especificación:** `restructuracion.md` §3.8

## Decisión

**Prophet se elimina.** No mejora a ningún método simple; es peor en los cuatro escenarios. En el escenario irregular, que es el que decide según la regla, tiene entre 1,1 y 1,5 días **más** de error que el mejor método simple. La regla pedía que lo **mejorara** por al menos 0,5 días.

**La predicción pasa a usar la mediana de las duraciones de la usuaria.**
- Empata con los demás métodos simples cuando los ciclos son regulares, irregulares o pocos.
- Gana con claridad cuando hay un ciclo atípico, por ejemplo un periodo que no se registró y deja un ciclo "doble".
- Es el método con menor error promedio entre escenarios en las 4 semillas probadas.

Como antes, la predicción sigue siendo **individual por usuaria** y se calcula al vuelo desde sus ciclos en la base de datos: no hay archivos, entrenamiento ni cron.

## Método

- **Datos:** sintéticos, generados en memoria. No se toca ninguna base de datos (RX-10). `scripts/seed_test_data.py` no se usó porque escribe en la base real.
- **Validación walk-forward:** cada ciclo se predice usando solo los ciclos anteriores de la misma usuaria. El error es `|duración predicha (redondeada) − duración real|`, en días.
- **Escenarios** (usuarias por escenario configurables; 40 con Prophet y 200 sin él):

| Escenario | Cómo se genera |
|---|---|
| Regular | Base fija por usuaria (26–31 días), ruido ±1 día, 6–12 ciclos |
| Irregular | Base 25–34 días, ruido ±4 días, deriva lenta, 6–12 ciclos |
| Pocos ciclos | Solo 1–3 duraciones conocidas antes de predecir |
| Atípico | Regular, con un ciclo 10–18 días más largo o más corto |

- **Métodos** (`app/services/cycle_forecast.py`):
  1. **Promedio:** la heurística que había.
  2. **Mediana.**
  3. **Promedio móvil ponderado:** últimas 6 duraciones, con más peso a las recientes.
  4. **Suavizado exponencial simple:** α = 0,3, fijo y no ajustado sobre los datos de prueba.
  5. **Prophet, en su mejor versión posible:** sin regresores y prediciendo exactamente en la fecha del último inicio, no en "penúltimo inicio + 28 días". En producción entrenaba con los regresores `avg_flow_level` y `avg_symptoms_lutea` pero no los pasaba al predecir; Prophet lanzaba un error y la app respondía con la heurística, así que en la práctica nunca llegó a predecir. Si hay menos de 2 duraciones, Prophet responde con el promedio, igual que en producción.
- **Tiempo:** milisegundos por predicción.
- **Memoria:** memoria máxima (RSS) del proceso que ejecuta cada método, incluidas sus importaciones. Cada método corre en su propio proceso.

## Resultados

### Con Prophet (40 usuarias por escenario, seed 42)

MAE en días (% de predicciones dentro de ±2 días):

| Método | Regular | Irregular | Pocos ciclos | Atípico | ms/predicción | Memoria (MB) |
|---|---|---|---|---|---|---|
| Promedio | 0,83 (97 %) | 3,66 (42 %) | 2,17 (66 %) | 3,31 (66 %) | 0,001 | 69 |
| **Mediana** | **0,82 (97 %)** | 3,73 (44 %) | 2,20 (64 %) | **2,63 (83 %)** | 0,001 | 69 |
| Promedio ponderado | 0,85 (98 %) | 3,73 (41 %) | 2,18 (63 %) | 3,67 (57 %) | 0,002 | 70 |
| Suavizado exponencial | 0,87 (98 %) | 3,65 (42 %) | 2,11 (64 %) | 3,44 (61 %) | 0,001 | 70 |
| Prophet | 1,22 (92 %) | 5,16 (33 %) | 3,26 (48 %) | 5,18 (45 %) | 246 | 145 |

Prophet en el escenario irregular frente al mejor método simple: **−1,50 días** (seed 42) y **−1,14 días** (seed 7). En las dos corridas peor, no mejor.

### Métodos simples (200 usuarias por escenario, seed 42)

| Método | Regular | Irregular | Pocos ciclos | Atípico |
|---|---|---|---|---|
| Promedio | 0,89 (96 %) | 3,74 (40 %) | 2,09 (66 %) | 3,26 (66 %) |
| **Mediana** | 0,90 (96 %) | 3,81 (40 %) | 2,09 (66 %) | **2,61 (83 %)** |
| Promedio ponderado | 0,91 (96 %) | 3,84 (39 %) | 2,12 (65 %) | 3,57 (59 %) |
| Suavizado exponencial | 0,90 (96 %) | 3,77 (40 %) | 2,09 (66 %) | 3,27 (64 %) |

Predicciones evaluadas: 1582 en regular, 1577 en irregular, 405 en pocos ciclos y 1703 en atípico.

MAE promedio entre escenarios de la mediana, por semilla: 2,35 (seed 42), 2,36 (seed 7), 2,35 (seed 123) y 2,42 (seed 2026). Fue el más bajo en las cuatro.

**Lectura:** en los escenarios regular, irregular y pocos ciclos, los cuatro métodos simples quedan a menos de 0,15 días entre sí, una diferencia del orden del ruido entre semillas. El único escenario con una diferencia real es el atípico: ahí la mediana baja unos 0,65 días el error y sube del 66 % al 83 % las predicciones dentro de ±2 días.

## Impacto en el despliegue

Tamaño de `site-packages` al instalar `requirements.txt` en un entorno limpio de Python 3.12 (`du -sm`):

| | Tamaño |
|---|---|
| Antes (con Prophet, pandas, scipy, scikit-learn, cmdstanpy…) | **611 MB**: no cabe en el límite de 500 MB de una función de Vercel |
| Después | **296 MB** |

`matplotlib` y `numpy` se quedan porque los usa el gráfico del PDF exportado (`export_service.py`).

## Qué cambió en el código

- `app/services/cycle_forecast.py` (nuevo): los cuatro métodos simples, como funciones puras.
- `app/services/prediction_service.py`: una sola función `predict_next_cycle` basada en la mediana. La respuesta de `/predictions/next` mantiene su forma: `prediction_source` siempre es `"heuristic"`, y `model_mae_days` y `cycles_used_for_training` siempre son `null`.
- **Eliminados:** `ml_service.py`, `ml_repo.py`, `user_repo.py`, `cycle_repo.get_cycles_with_features` y los scripts `evaluate_models.py`, `retrain_models.py`, `verify_ml_env.py` y `audit_pkl_privacy.py`. También `tests/test_ml_service.py` y las dependencias `prophet`, `cmdstanpy`, `pandas`, `holidays`, `tqdm`, `importlib_resources`, `scikit-learn`, `scipy`, `threadpoolctl`, `narwhals` y `joblib`.
- `account_service`: ya no borra archivos `.pkl`, porque ya no existen.
- `.github/workflows/ml-eval.yml`: ahora repite esta evaluación, sin Prophet, en los PR que tocan la predicción.

## Pendientes que quedan fuera de T24

- **Tabla `ml_models`:** ya no se usa, pero sigue en el esquema. `account_repo` todavía borra sus filas al eliminar una cuenta, y así debe seguir mientras exista. Eliminarla requiere SQL manual (RX-09); queda para T12.
- **Campos `model_mae_days` y `cycles_used_for_training`:** siguen en la API para no romper el frontend. El badge "IA activada" de `PredictionWidget.tsx` ya no se mostrará nunca. Limpiarlos queda para T13 (UI) y T14 (`ENDPOINTS.md`).
- **Docs históricos** (`ML_STRATEGY.md`, `DEPLOY.md`, `CRITERIOS_ISSUES.md`…) todavía describen Prophet: T12.

## Cómo reproducir

```bash
cd backend
python scripts/evaluate_prediction.py --skip-prophet --users 200 --seed 42   # métodos simples (~10 s)

# Para incluir Prophet hay que instalarlo aparte; ya no está en requirements.txt:
pip install prophet==1.3.0
python scripts/evaluate_prediction.py --users 40 --seed 42                   # ~4 min
```
