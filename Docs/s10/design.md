# EVA — Guía de diseño

> **Qué es este documento:** la filosofía, la voz y el sistema visual de EVA. Es la única referencia de diseño vigente: reemplaza la referencia a `Docs/eva_responsive_redesign/serene_health/DESIGN.md`, que no existe en el repo (DP-33).
>
> **Fuente de los tokens:** `frontend/src/index.css` (bloque `@theme`, Tailwind v4). Si este documento y `index.css` difieren, se corrige uno de los dos en el mismo PR.
>
> **Marco:** [`restricciones.md`](restricciones.md) (RX-04, RX-07) y [`reglas.md`](reglas.md) (RG-11, RG-12).
>
> Última revisión: 2026-10-25.

---

## 1. Filosofía

EVA acompaña, no vigila. Cada decisión de diseño se mide contra cinco principios, en este orden de prioridad:

1. **Privacidad visible.** La usuaria debe *sentir* que sus datos son suyos:
   - El export y el borrado de cuenta están a dos toques, no escondidos.
   - Nunca se piden datos que no se usan.
   - Cuando algo sale del dispositivo (sincronización, chatbot), se dice.
2. **Calma.** Es una app de salud, no de productividad:
   - Sin rachas, puntos, badges de logro ni notificaciones de culpa ("¡No registraste ayer!").
   - Los colores son suaves y el movimiento, mínimo.
3. **Sin juicio.** No hay ciclos "normales" ni "anormales" en la UI.
   - Los datos se describen ("tu ciclo duró 32 días") y no se califican ("ciclo irregular ⚠️").
   - Ante algo que merece atención médica, se recomienda consultar, sin alarmar.
4. **Claridad antes que densidad.** Una idea principal por tarjeta; el dato importante, grande (`display-stat`); el contexto, debajo.
5. **Funciona sin red.** El estado offline es un estado normal, no un error (RG-09).

## 2. Voz y tono

| Aspecto | Regla | Sí | No |
|---|---|---|---|
| Persona | Tú, español neutro | "Revisa tu correo" | "Revisá tu correo", "Revise su correo" |
| Sujeto | La usuaria y su cuerpo | "Tu periodo podría empezar en 3 días" | "La paciente presenta…" |
| Certeza | Las predicciones son estimaciones | "Estimamos", "podría" | "Tu periodo empieza el 12" |
| Salud | No diagnosticar; derivar | "Si el dolor te impide hacer tus actividades, consulta a tu ginecóloga/o" | "Esto es endometriosis" |
| Errores | Qué pasó y qué hacer, sin culpa ni jerga | "No pudimos guardar. Lo intentaremos cuando vuelvas a tener conexión." | "Error 500", "Request failed" |
| Vacíos | Invitar, no reprochar | "Aún no hay registros. ¿Cómo te sientes hoy?" | "No hay datos" |
| Chatbot | Siempre con disclaimer | "EVA no reemplaza el consejo médico profesional." | — |

Reglas de escritura:
- Frases cortas.
- Verbos en los botones ("Guardar registro", no "OK").
- Sin signos de exclamación salvo en las confirmaciones positivas.
- Sin emojis en la UI (se usan íconos, §6).

Textos fijos:

| Clave | Texto |
|---|---|
| Disclaimer del chatbot | EVA no reemplaza el consejo médico profesional. |
| Respuesta de respaldo (`is_automatic=true`) | Etiqueta: **Respuesta automática**. Ayuda: "Nuestro asistente no está disponible ahora; esta orientación se basa en tu fase del ciclo." |
| Offline | Sin conexión. Tus registros se guardan en este dispositivo y se sincronizarán al volver. |
| Borrado de cuenta | Esto elimina tu cuenta y **todos** tus registros de forma permanente. No se puede deshacer. |
| Consentimiento (registro) | ☐ Autorizo a EVA a tratar mis datos de salud menstrual (sensibles) para registrar mi ciclo y darme predicciones y orientación. Sé que entregarlos es voluntario, que se alojan en servidores fuera de Colombia y que puedo revocar esta autorización cuando quiera. [Leer la política de tratamiento] |
| Términos (registro) | ☐ Acepto los [Términos de uso] y declaro que soy mayor de 18 años. |
| Proveedor del chatbot | **Nunca se muestra.** La UI no nombra a Groq, Cloudflare ni ningún modelo (RX-06). |

## 3. Color

### 3.1 Roles

| Token (`--color-*`) | Valor | Rol |
|---|---|---|
| `surface` | `#fff8f8` | Fondo de la app |
| `surface-container-lowest` | `#ffffff` | Tarjetas |
| `surface-container-low` / `-container` / `-high` / `-highest` | `#fff0f3` / `#ffe8ed` / `#fae2e8` / `#f5dde2` | Capas y hover, de menos a más profundidad |
| `on-surface` | `#25181c` | Texto sobre surface |
| `text-main` | `#1E293B` | Texto principal |
| `text-muted` / `on-surface-variant` | `#64748B` / `#574148` | Texto secundario |
| `outline` / `outline-variant` / `border-subtle` | `#8b7078` / `#debec7` / `#F1F5F9` | Bordes: fuerte, decorativo, sutil |
| `primary` | `#af1665` | Acción principal y marca |
| `on-primary` | `#ffffff` | Texto sobre primary |
| `primary-container` | `#d0367e` | Hover y énfasis de primary |
| `primary-fixed-dim` | `#ffb0ca` | Anillo de foco (al 30 %) |
| `secondary` | `#6b38d4` | Insights y chatbot |
| `tertiary` | `#006c07` | Fertilidad y ovulación |
| `error` / `error-container` / `on-error-container` | `#ba1a1a` / `#ffdad6` / `#93000a` | Errores y zona de peligro |
| `success-green` | `#10B981` | Solo íconos e indicadores |
| `warning-orange` | `#F59E0B` | Solo íconos e indicadores (offline) |

### 3.2 Fases del ciclo

| Fase | Fondo | Acento (borde, ícono, barra) |
|---|---|---|
| Menstrual | `menstrual-pink` `#FFF5F7` | `primary` |
| Folicular | `follicular-green` `#E6FFFA` | `tertiary` |
| Ovulación | `ovulation-purple` `#F5F3FF` | `secondary` |
| Lútea | `luteal-yellow` `#FFFBEB` | `warning-orange` |
| Predicción | sin fondo | borde punteado `outline` |

Los fondos de fase tienen un contraste de ≈1.0:1 contra `surface`: **son invisibles sin acento**. Toda superficie de fase lleva un borde, ícono o barra con su color de acento, y además el **nombre de la fase en texto**. El color nunca es el único portador de la información.

### 3.3 Contraste (WCAG 2.1 AA, medido)

| Par | Ratio | Uso permitido |
|---|---|---|
| `text-main` / `surface` | 13.96 | Cualquier texto |
| `on-surface-variant` / `surface` | 8.88 | Cualquier texto |
| `primary` / `surface` | 6.41 | Texto y links |
| `secondary` / blanco | 6.68 | Texto |
| `tertiary` / blanco | 6.67 | Texto |
| `error` / `error-container` | 5.00 | Texto de error |
| blanco / `primary-container` | 4.66 | Texto de botón ≥ 14 px |
| `text-muted` / `surface` | 4.54 | Texto secundario (en el límite: no bajar de 14 px) |
| `success-green` / blanco | **2.54** | **Nunca como texto** |
| `warning-orange` / blanco | **2.15** | **Nunca como texto** |

### 3.4 Prohibido

- Hex sueltos en componentes (DP-24): siempre un token.
- Tokens legacy (`eva-*`, `lavender-*`, `green-*`, `text-primary`, `border`…): se migran y se eliminan (DP-23).
- Rojo para la fase menstrual o para "días de sangrado": no es un error.
- Modo oscuro: **fuera de alcance en S10**. La variante `dark` existe en `index.css`, pero no hay tokens oscuros; no se usa `dark:`.

## 4. Tipografía

- **Plus Jakarta Sans** (`font-sans`): títulos y cuerpo.
- **Inter** (`font-inter`): labels, datos tabulares y números pequeños.
- Ambas **self-hosted** (RX-07, DP-21).

| Token | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| `text-display-stat` | 48 / 48 | 700 | El dato principal de una tarjeta ("Día 14") |
| `text-headline-lg` | 32 / 40 | 700 | Título de página (uno por página) |
| `text-headline-md` | 24 / 32 | 600 | Título de sección |
| `text-headline-sm` | 20 / 28 | 600 | Título de tarjeta |
| `text-body-lg` | 18 / 28 | 400 | Texto destacado |
| `text-body-md` | 16 / 24 | 400 | Texto base |
| `text-body-sm` | 14 / 20 | 400 | Texto secundario (mínimo para `text-muted`) |
| `text-label-md` | 12 / 16, +0.05em | 500 | Labels, chips, nav |

- Jerarquía: un `headline-lg` por página y un `headline-sm` por tarjeta.
- Los números que se comparan (duraciones, fechas en tablas) llevan `tabular-nums`.

## 5. Espacio, forma y elevación

**Espaciado** (tokens `--spacing-*`):

| Token | Valor | Uso |
|---|---|---|
| `stack-sm` | 0.5rem | Dentro de un grupo (label + input) |
| `stack-md` | 1rem | Entre grupos |
| `stack-lg` | 2rem | Entre secciones |
| `gutter` | 1.5rem | Separación del grid |
| `margin-mobile` / `margin-desktop` | 1rem / 2.5rem | Margen lateral de página |
| `container-max` | 1200px | Ancho máximo del contenido |

**Radios** (hoy hay 6 valores en uso; se reducen a 4):

| Clase | Uso |
|---|---|
| `rounded-3xl` | Tarjetas y modales |
| `rounded-xl` | Botones, inputs, chips grandes |
| `rounded-full` | Avatares, badges, celdas de calendario en móvil, FAB |
| `rounded-lg` | Elementos pequeños dentro de tarjetas (tooltips, barras) |

`rounded-2xl` y `rounded-sm` se migran a la clase más cercana.

**Elevación** (hoy hay 5 niveles; se reducen a 2):

| Nivel | Clase | Uso |
|---|---|---|
| 1 | `shadow-sm` + `border border-border-subtle` | Tarjetas |
| 2 | `shadow-lg` | Modales, FAB, menús flotantes |

## 6. Iconografía

- **Material Symbols Outlined**, self-hosted (RX-07). Tamaño 20 px en línea con texto y 24 px en la navegación.
- Un ícono acompaña a un texto; si va solo (botón de ícono), lleva `aria-label`.
- Sin emojis en la UI.
- Íconos de fase: menstrual `water_drop`, folicular `eco`, ovulación `star`, lútea `dark_mode`, predicción `schedule`.

## 7. Layout y navegación

| Breakpoint | Navegación | Contenido |
|---|---|---|
| < 768 px (móvil) | `TopAppBar` móvil + `BottomNavBar` (Hoy, Ciclo, Tendencias, Perfil) + FAB en el calendario | Una columna, `margin-mobile` |
| 768–1023 px (tablet) | `TopAppBar` con tabs | Grid de 12 columnas |
| ≥ 1024 px (desktop) | `Sidebar` fija `w-64` + `TopAppBar` | Bento grid de 12 columnas, `container-max` |

**Hueco detectado:** en tablet, `BottomNavBar` está oculta (`md:hidden`) y `Sidebar` también (`hidden lg:flex`). `TopAppBar` muestra solo 3 tabs (Dashboard, Calendar, Insights), así que **Síntomas y Exportar no son navegables en tablet** (DP-36). Regla: toda sección principal se alcanza desde la navegación en todos los breakpoints.

Dashboard (bento, desktop):

| Tarjeta | Columnas |
|---|---|
| `PhaseCard` | 8 |
| `CycleProgressCard` | 4 |
| `TrendChartCard` | 7 |
| `RecommendationsCard` | 5 |

En móvil, el orden es el mismo, apilado.

## 8. Componentes base

| Componente | Variantes | Reglas |
|---|---|---|
| `Button` | `primary`, `secondary`, `ghost`, `danger` | Alto mínimo 44 px. Una sola `primary` por vista. Estado `loading` con spinner y texto ("Guardando…"). `active:scale-95` |
| `Input` | default, error | Siempre con `<label>` visible. El error va debajo, en `error`, y enlazado con `aria-describedby` |
| `Card` | default, fase | `rounded-3xl`, nivel 1. La variante fase sigue §3.2 |
| `Badge` | fase, neutral, estado | El texto siempre visible; no basta el color |
| `Toast` | info, error | Se cierra solo a los 5 s (los errores esperan a la usuaria). `role="status"` / `role="alert"` |
| `Modal` | default, peligro | Foco atrapado, `Esc` cierra, el foco vuelve al disparador. Los de peligro piden confirmación explícita (escribir "ELIMINAR" o un checkbox) |
| `OfflineIndicator` | — | Fondo `warning-orange` con texto `text-main` (no blanco: contraste) |

## 9. Estados

Toda vista con datos define cinco estados:

| Estado | Patrón |
|---|---|
| Cargando | Skeleton con la forma del contenido (no un spinner de página completa) |
| Vacío | Ícono + frase de invitación + acción principal |
| Error | Mensaje según §2 + botón "Reintentar" |
| Offline | Contenido desde Dexie + `OfflineIndicator`; las acciones de escritura siguen habilitadas |
| Éxito | Toast breve; sin modales de confirmación |

## 10. Movimiento

- Transiciones de 150–200 ms, solo en `colors`, `opacity` y `transform`. Nada de `transition-all`, que hoy aparece 21 veces y se migra.
- `animate-spin` solo en spinners. `animate-bounce` no se usa.
- Todo movimiento respeta `prefers-reduced-motion: reduce` (`motion-safe:` / `motion-reduce:` en Tailwind).

## 11. Accesibilidad (mínimo exigido)

- WCAG 2.1 AA: contraste según §3.3.
- Todo es operable con teclado, con el foco visible (`ring-2 ring-primary-fixed-dim/30` + offset).
- Áreas táctiles de 44 × 44 px como mínimo.
- `lang="es"` en `index.html`.
- Calendario: cada celda con `aria-label` completo ("12 de marzo, fase lútea, predicción de periodo").
- Gráficos: un resumen textual al lado o en `aria-describedby`.
- Lighthouse Accessibility ≥ 90 (`lighthouse.yml` ya existe).

## 12. Visualización de datos

- Barras de duración de ciclo: un color (`secondary`), el promedio marcado con una línea punteada `outline` y su etiqueta en texto.
- Sin ejes rojos ni "zonas de peligro".
- Cada gráfico tiene un título que dice la conclusión ("Tus últimos 6 ciclos duraron entre 27 y 31 días"), no solo "Duración".

## 13. Legal en la UI

- Los dos checkboxes del registro van **sin marcar**, separados, con el link a la política de tratamiento en el mismo texto.
- Los links "Privacidad" y "Términos" aparecen en el registro, el login, el perfil y el pie de `ExportPage`.
- Las páginas `/legal/*` muestran la versión y la fecha de vigencia arriba, con tipografía `body-md` y ancho de lectura de 68 caracteres como máximo.
- El estado vacío del chat incluye el disclaimer médico.

## 14. Prototipos

Enlace a los prototipos aprobados (T21): *pendiente*.

## 15. Checklist de PR de UI

- [ ] Solo tokens (sin hex, sin legacy).
- [ ] Textos según §2 (tú, sin jerga, sin juicio).
- [ ] Los 5 estados de §9 cubiertos.
- [ ] Contraste según §3.3; el color nunca es el único portador de la información.
- [ ] Teclado y foco probados; `aria-label` en los íconos solos.
- [ ] Probado a 375, 768 y 1280 px.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Sin recursos de terceros (RX-07).
