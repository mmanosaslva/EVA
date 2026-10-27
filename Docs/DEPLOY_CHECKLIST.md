# EVA — Checklist de deploy

Verificación manual después de cada deploy a producción (y del primero, T25). Cómo desplegar: [`DEPLOY.md`](DEPLOY.md).

Anota en el PR la fecha, la URL probada y el resultado de cada punto.

## 1. Antes de mergear a la Production Branch (`develop` hasta T19)

```bash
# Backend
cd backend
pip install -r requirements.txt -r requirements-dev.txt
ruff check .
python -m pytest -q

# Frontend
cd frontend
npm ci
npm run build
npm run test:run
```

- [ ] El CI del PR está en verde.
- [ ] Si el PR trae un cambio de esquema, su SQL (`Docs/s10/sql/`) ya está aplicado **con snapshot previo** en producción y en el branch `preview` de Neon.

## 2. Build en Vercel

- [ ] El build terminó sin errores.
- [ ] La función `api/index.py` pesa menos de 500 MB (lo dice el log del build).
- [ ] La región de la función es `gru1` (*Settings → Functions*), o el cambio quedó anotado en `Docs/s10/verificaciones.md`.

## 3. Prueba manual en producción

Con una cuenta de prueba (no la personal), en `https://<proyecto>.vercel.app`:

- [ ] `GET /api/health` responde `200`.
- [ ] **Registro:** llega el email de verificación y su link abre la URL de producción.
- [ ] **Verificación de email:** el link activa la cuenta.
- [ ] **Login** y **logout**.
- [ ] **Recuperar contraseña:** llega el email y el link permite cambiarla.
- [ ] **Ciclos:** crear, editar y borrar un ciclo.
- [ ] **Síntomas:** registrar un día con síntomas.
- [ ] **Predicción:** el dashboard muestra la fecha estimada del próximo ciclo.
- [ ] **Chatbot:** responde una pregunta.
- [ ] **Export:** descargar el CSV y el PDF.
- [ ] **Borrado de cuenta:** borrar la cuenta de prueba; después, en Neon, el conteo de huérfanos da 0 (`Docs/s10/sql/T4-borrado-total.sql`, paso 6).

## 4. Previews

- [ ] Un PR de prueba genera su URL de preview.
- [ ] Registrarse en el preview **no** crea la cuenta en la base de producción: la cuenta aparece en el branch `preview` de Neon y no en el de producción.

## 5. Privacidad

- [ ] Si Sentry está configurado: en *Issues* no aparecen emails, tokens ni datos de ciclos.
- [ ] Ninguna clave aparece en el repo: `git grep -nE "gsk_[A-Za-z0-9]{20,}|xkeysib-[A-Za-z0-9]{20,}"` no devuelve nada (los placeholders como `gsk_...` no cuentan).
