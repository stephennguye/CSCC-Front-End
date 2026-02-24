// src/features/transcript/TranscriptPanel.tsx
// T037 – Live transcript panel; renders committed entries + streaming partial row.
// Source: spec.md US2 ACs; data-model.md §TranscriptSlice; plan.md §Principle V (append-only)

import React from 'react'
import { useAppStore } from '../../store/store'
import { TranscriptEntry } from './TranscriptEntry'
import { useTranscriptScroll } from './hooks/useTranscriptScroll'
import { sanitise } from '../../shared/utils/sanitise'

/**
 * TranscriptPanel — live, auto-scrolling call transcript.
 *
 * Rendering strategy:
 * - Committed entries are each rendered as a `<TranscriptEntry>`.
 * - The in-progress AI token stream (`currentPartial`) is rendered as a
 *   separate partial row so it never mutates committed nodes (append-only,
 *   Principle V).
 * - `aria-live="polite"` so screen-readers announce new content non-disruptively.
 * - Text is `rem`-based for 200% browser-zoom accessibility (FR-025).
 */
export function TranscriptPanel(): React.ReactElement {
  // Scalar selectors — one per state slice to avoid unnecessary re-renders
  const entries = useAppStore((s) => s.transcript.entries)
  const currentPartial = useAppStore((s) => s.transcript.currentPartial)
  const speakerLabels = useAppStore((s) => s.transcript.speakerLabels)

  const containerRef = useTranscriptScroll(entries.length)

  const hasContent = entries.length > 0 || currentPartial.length > 0

  return (
    <section
      aria-label="Call transcript"
      style={{
        width: '100%',
        maxWidth: '40rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <h2
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: 0,
        }}
      >
        Transcript
      </h2>

      {/* Scrollable list — aria-live region for screen-reader announcements */}
      <div
        ref={containerRef}
        role="log"
        aria-live="polite"
        aria-label="Transcript messages"
        aria-relevant="additions"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          overflowY: 'auto',
          maxHeight: '20rem',
          minHeight: '5rem',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          background: '#fafafa',
          // Smooth scrolling for auto-scroll UX
          scrollBehavior: 'smooth',
        }}
      >
        {!hasContent && (
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#9ca3af',
              textAlign: 'center',
              alignSelf: 'center',
              padding: '1rem 0',
            }}
          >
            Transcript will appear here when the call starts.
          </p>
        )}

        {/* Committed entries */}
        {entries.map((entry) => (
          <TranscriptEntry
            key={entry.index}
            entry={entry}
            speakerLabel={speakerLabels[entry.speaker]}
          />
        ))}

        {/* Streaming partial row — shown while AI is speaking tokens */}
        {currentPartial.length > 0 && (
          <div
            aria-label="AI is speaking"
            data-speaker="ai"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              background: '#f0fdf4',
              alignSelf: 'flex-start',
              maxWidth: '85%',
              // Subtle pulsing border to signal streaming activity
              border: '1px dashed #6ee7b7',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#065f46',
              }}
            >
              {speakerLabels.ai}
            </span>
            <p
              /* eslint-disable-next-line react/no-danger */
              dangerouslySetInnerHTML={{ __html: sanitise(currentPartial) }}
              style={{
                margin: 0,
                fontSize: '1rem',
                lineHeight: 1.6,
                color: '#111827',
                wordBreak: 'break-word',
              }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
