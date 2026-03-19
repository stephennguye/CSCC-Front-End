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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0',
        minHeight: 0,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
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
          gap: '0.75rem',
          overflowY: 'auto',
          flex: '1 1 0',
          minHeight: 0,
          padding: '1rem',
          scrollBehavior: 'smooth',
        }}
      >
        {!hasContent && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              minHeight: '8rem',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
              }}
            >
              Conversation will appear here when the call starts.
            </p>
          </div>
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
              gap: '0.375rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-card)',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-accent)',
              alignSelf: 'flex-start',
              maxWidth: '80%',
              animation: 'partialPulse 2s ease-in-out infinite',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.04em',
              }}
            >
              {speakerLabels.ai}
            </span>
            <p
              /* eslint-disable-next-line react/no-danger */
              dangerouslySetInnerHTML={{ __html: sanitise(currentPartial) }}
              style={{
                margin: 0,
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                color: 'var(--color-text)',
                wordBreak: 'break-word',
              }}
            />
          </div>
        )}
      </div>

      {/* Keyframe for pulsing border on streaming partial */}
      <style>{`
        @keyframes partialPulse {
          0%, 100% { border-color: var(--color-accent); opacity: 1; }
          50% { border-color: transparent; opacity: 0.85; }
        }
      `}</style>
    </section>
  )
}
