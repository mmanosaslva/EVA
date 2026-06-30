# EVA — Frontend

[![Stack](https://img.shields.io/badge/React%2019-%2300d8ff?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite%208-%23646cff?logo=vite)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind%20CSS%20v4-%2338bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-offline--first-%235a0fc8)](https://web.dev/progressive-web-apps/)

Plataforma de salud menstrual. PWA offline-first construida con React + TypeScript + Vite.

---

## Quick Start

```bash
npm install        # Instalar dependencias
npm run dev        # Arrancar en http://localhost:5173
npm run preview    # Probar versión de producción con PWA
```

---

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
cd frontend
npm install
```

> **Nota**: El archivo `.env.example` se creará cuando se implemente Supabase Auth (Issue #14). Por ahora no es necesario.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run dev -- --host` | Igual que `dev` pero accesible desde la red local (móvil) |
| `npm run build` | Compila TypeScript y genera build de producción |
| `npm run preview` | Previsualiza la build final en http://localhost:4173 |
| `npm run preview -- --host` | Igual que `preview` pero accesible desde la red local |
| `npm run lint` | Ejecuta ESLint en todo el proyecto |
| `npm run format` | Formatea el código con Prettier |
| `npm run format:check` | Verifica el formato sin modificar archivos |

---

## Tech Stack

| Capa | Tecnología |
|------|------------|
| **Framework** | React 19 + TypeScript (strict mode) |
| **Build** | Vite 8 |
| **Estilos** | Tailwind CSS v4 (configurado en `index.css` vía `@theme`) |
| **PWA** | vite-plugin-pwa + Workbox |
| **Linting** | ESLint + Prettier |

---

## Sistema de Diseño

El proyecto incluye un sistema de diseño base con los siguientes componentes en `src/components/ui/`:

| Componente | Descripción | Variantes |
|------------|-------------|-----------|
| `Button` | Botón interactivo | `primary`, `secondary`, `ghost` |
| `Input` | Campo de entrada con label y error | Estados: default, focus, error |
| `Card` | Tarjeta con sombra y bordes redondeados | Padding: `none`, `sm`, `md`, `lg` |
| `Badge` | Etiqueta para fases del ciclo menstrual | `menstruacion`, `folicular`, `ovulacion`, `lutea`, `default` |

### Paleta de colores

Colores definidos en `src/index.css` mediante `@theme` de Tailwind v4:

| Color | Variable CSS | Tono |
|-------|-------------|------|
| **EVA** (rosa) | `--color-eva-*` | #ec4899 → cálido, femenino |
| **Lavanda** | `--color-lavender-*` | #8b5cf6 → bienestar |
| **Verde salud** | `--color-green-*` | #10b981 → médico, vital |

Cada color tiene 9 tonalidades (50 al 900).

### Dark Mode

Dark mode configurado con estrategia `class`. Para activarlo, agrega la clase `dark` al elemento `<html>`:

```html
<html class="dark">
```

Los colores de superficie y texto se adaptan automáticamente.

### Demo

```bash
npm run preview
```

Abre `http://localhost:4173` — la página de inicio (`DemoPage`) muestra todos los componentes del sistema de diseño.

---

## PWA

La aplicación está configurada como Progressive Web App con las siguientes características:

### Manifest

Definido en `vite.config.ts` y generado como `manifest.webmanifest` en el build:

| Propiedad | Valor |
|-----------|-------|
| Nombre | EVA — Salud Menstrual |
| Nombre corto | EVA |
| Display | `standalone` (sin barra de navegación) |
| Orientación | `portrait` (vertical) |
| Tema | `#ec4899` (rosa EVA) |
| Fondo | `#ffffff` |
| Idioma | `es` |
| Iconos | 192x192 y 512x512 (`public/icons/`) |
| Screenshots | Desktop y mobile (`public/screenshots/`) |

### Service Worker

Estrategia **autoUpdate**: el Service Worker se registra y actualiza automáticamente.

| Recurso | Estrategia | Descripción |
|---------|------------|-------------|
| Assets estáticos | `CacheFirst` | JS, CSS, HTML, imágenes, fuentes |
| API Supabase | `NetworkFirst` | Cache 50 entradas, expira 1 hora |

### Probar PWA en dispositivo móvil

```bash
npm run preview -- --host
```

1. Obtén la IP de tu PC (comando `ipconfig` en Windows)
2. En tu Android/iOS, abre Chrome y navega a `http://192.168.X.X:4173`
3. Abre el menú → "Agregar a pantalla de inicio"

---

## Estructura de carpetas

```
frontend/
├── public/
│   ├── icons/              # Iconos PWA (192x192, 512x512)
│   ├── screenshots/        # Screenshots para Rich Install UI
│   └── favicon.svg         # Favicon SVG
├── src/
│   ├── components/
│   │   └── ui/             # Button, Input, Card, Badge
│   ├── pages/              # Páginas de la aplicación
│   ├── hooks/              # Custom hooks
│   ├── services/           # Llamadas a la API
│   ├── store/              # Estado global (Zustand)
│   ├── db/                 # IndexedDB (Dexie.js)
│   ├── lib/                # Utilidades
│   ├── index.css           # Tailwind v4: @import + @theme + @custom-variant
│   ├── App.tsx             # Entry point
│   └── main.tsx            # ReactDOM render
├── vite.config.ts          # Vite + React + Tailwind + PWA
├── tsconfig.json           # TypeScript config
├── eslint.config.js        # ESLint config
├── .prettierrc             # Prettier config
└── .gitignore              # Ignora node_modules, dist
```

> Tailwind CSS v4 se configura directamente en `src/index.css` mediante las directivas `@import`, `@theme` y `@custom-variant`. No requiere archivo `tailwind.config.ts`.

---

## Variables de entorno

Crear archivo `.env.local` cuando se implemente la integración con el backend:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000
```

---

## Troubleshooting

### El modo standalone no funciona (se ve la barra del navegador)

1. Asegúrate de usar `npm run preview`, no `npm run dev`
2. Desinstala la app de la pantalla de inicio
3. Limpia la caché de Chrome en Android
4. Reinstala desde `http://192.168.X.X:4173`

### El ícono no aparece en la pantalla de inicio

1. Ejecuta `npm run build` para regenerar los iconos en `dist/icons/`
2. Asegúrate de que los archivos `public/icons/icon-192.png` y `public/icons/icon-512.png` existen

### El Service Worker no se registra

1. Verifica que estás usando `npm run preview` (no `npm run dev`)
2. Abre DevTools → Application → Service Workers
3. Si hay un SW antiguo, haz clic en "Unregister" y recarga

### Error "Page cannot be installed"

1. Asegúrate de que el manifest se carga correctamente (DevTools → Application → Manifest)
2. Verifica que los iconos existen en `public/icons/`
3. Si usas HTTP en producción, algunos navegadores requieren HTTPS