import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react"
import './index.css'
import App from './App.tsx'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT || "development",
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event: Sentry.ErrorEvent) {
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = "[FILTERED]"
      }
      if (event.extra) {
        delete event.extra.email
        delete event.extra.token
      }
      return event
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ocurrió un error inesperado.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
