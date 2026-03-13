// src/features/dashboard/ExportButton.tsx
// T044 – Export button for the post-call dashboard (spec.md US4 AC4; FR-022)
// On click: builds export payload, creates a Blob, triggers file download via <a>.
// Disabled while isLoading is true.

import React from 'react'
import Button from '../../shared/components/Button'
import { buildExportPayload } from '../../shared/utils/export'
import type { PostCallResponse } from '../../shared/types/call-session'

export interface ExportButtonProps {
  sessionData: PostCallResponse
  isLoading: boolean
  /** Optional filename override — defaults to session-<id>.json */
  filename?: string
}

/**
 * Triggers a JSON download of the full post-call session data.
 *
 * Flow:
 * 1. `buildExportPayload(sessionData)` adds `exportedAt` ISO timestamp.
 * 2. `JSON.stringify` serialises to a pretty-printed string.
 * 3. A temporary `<a>` element triggers the browser's native file save.
 * 4. The URL is immediately revoked to release memory.
 */
export function ExportButton({ sessionData, isLoading, filename }: ExportButtonProps): React.ReactElement {
  const handleExport = () => {
    const payload = buildExportPayload(sessionData)
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const downloadName = filename ?? `session-${sessionData.session.id}.json`

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = downloadName
    anchor.setAttribute('aria-hidden', 'true')
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)

    // Release object URL immediately after triggering download
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="secondary"
      disabled={isLoading}
      onClick={handleExport}
      aria-label="Export session data as JSON file"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        fontSize: '0.8125rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-input)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
      }}
    >
      {/* Download icon (inline SVG — no external deps) */}
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M8 1v9M5 7l3 3 3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Export JSON
    </Button>
  )
}
