'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    // Renders outside the app shell and its message catalog, so the copy is
    // inline and bilingual (Spanish first, the default locale).
    <html lang="es">
      <body style={{ background: '#F5F8FC', color: '#14213D', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 400, fontFamily: 'Georgia, serif' }}>Algo no salió bien.</h2>
          <p lang="en" style={{ color: '#56627C' }}>Something didn&apos;t work.</p>
          <button
            onClick={reset}
            style={{ marginTop: 16, minHeight: 48, padding: '0 24px', borderRadius: 9999, border: 0, background: '#2F6FE4', color: '#fff', fontWeight: 800 }}
          >
            Intentar de nuevo · Try again
          </button>
        </div>
      </body>
    </html>
  )
}
