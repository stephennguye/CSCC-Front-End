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
 * Renders a single committed TranscriptEntry as a chat bubble.
 *
 * - User messages: right-aligned with accent-blue tinted background.
 * - AI messages: left-aligned with surface-colored background.
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

  const isUser = entry.speaker === 'user'

  return (
    <div
      data-speaker={entry.speaker}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-card)',
        background: isUser ? '#1e3a5f' : 'var(--color-surface-hover)',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
      }}
    >
      {/* Speaker label row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        <Badge variant={entry.speaker}>{displayLabel}</Badge>
        <time
          dateTime={new Date(entry.timestamp).toISOString()}
          style={{
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted)',
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
          fontSize: '0.9375rem',     // rem-based for zoom accessibility (FR-025)
          lineHeight: 1.6,
          color: 'var(--color-text)',
          wordBreak: 'break-word',
        }}
      />
    </div>
  )
}
