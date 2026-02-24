// src/features/transcript/TranscriptEntry.tsx
// T035 – Renders a single committed TranscriptEntry with speaker badge and timestamp.
// Source: data-model.md §TranscriptEntry; plan.md §Principle VII (sanitise all untrusted text)

import React from 'react'
import Badge from '../../shared/components/Badge'
import { sanitise } from '../../shared/utils/sanitise'
import type { TranscriptEntry as TranscriptEntryType } from '../../shared/types/call-session'

export interface TranscriptEntryProps {
  entry: TranscriptEntryType
  speakerLabel?: string
}

/**
 * Renders a single committed TranscriptEntry.
 *
 * - Speaker is surfaced via a `<Badge>` with `user` or `ai` variant.
 * - `entry.text` is passed through `sanitise()` before DOM insertion (Principle VII).
 * - Timestamp is formatted as a locale time string.
 */
export function TranscriptEntry({
  entry,
  speakerLabel,
}: TranscriptEntryProps): React.ReactElement {
  const timeLabel = new Date(entry.timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const displayLabel =
    speakerLabel ?? (entry.speaker === 'user' ? 'You' : 'AI')

  const safeText = sanitise(entry.text)

  return (
    <div
      data-speaker={entry.speaker}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        background: entry.speaker === 'user' ? '#eff6ff' : '#f0fdf4',
        alignSelf: entry.speaker === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
      }}
    >
      {/* Speaker label row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Badge variant={entry.speaker}>{displayLabel}</Badge>
        <time
          dateTime={new Date(entry.timestamp).toISOString()}
          style={{
            fontSize: '0.6875rem',
            color: '#6b7280',
            lineHeight: 1.5,
          }}
        >
          {timeLabel}
        </time>
      </div>

      {/* Transcript text — set via dangerouslySetInnerHTML after DOMPurify sanitisation */}
      <p
        /* eslint-disable-next-line react/no-danger */
        dangerouslySetInnerHTML={{ __html: safeText }}
        style={{
          margin: 0,
          fontSize: '1rem',        // rem-based for zoom accessibility (FR-025)
          lineHeight: 1.6,
          color: '#111827',
          wordBreak: 'break-word',
        }}
      />
    </div>
  )
}
