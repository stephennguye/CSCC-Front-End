// src/features/dashboard/TranscriptSection.tsx
// T041 – Post-call transcript section for the dashboard (spec.md US4 AC1, AC5)
// Renders the full transcript array from PostCallResponse using TranscriptEntry.
// Shows EmptyState if transcript is empty.

import React from 'react'
import { TranscriptEntry } from '../transcript/TranscriptEntry'
import EmptyState from '../../shared/components/EmptyState'
import type { TranscriptEntry as TranscriptEntryType } from '../../shared/types/call-session'

export interface TranscriptSectionProps {
  transcript: TranscriptEntryType[]
}

/**
 * Renders the full post-call transcript.
 * Re-uses the same `<TranscriptEntry>` component used during live calls so
 * the visual treatment (speaker badges, timestamps, sanitised text) is consistent.
 */
export function TranscriptSection({ transcript }: TranscriptSectionProps): React.ReactElement {
  return (
    <section aria-labelledby="transcript-section-heading">
      <h2
        id="transcript-section-heading"
        style={{
          margin: '0 0 0.75rem',
          fontSize: '1rem',
          fontWeight: 700,
          color: '#111827',
        }}
      >
        Transcript
      </h2>

      {transcript.length === 0 ? (
        <EmptyState
          title="No transcript available"
          description="No speech was recorded during this call."
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
          role="list"
          aria-label="Call transcript"
        >
          {transcript.map((entry) => (
            <div key={entry.index} role="listitem">
              <TranscriptEntry entry={entry} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
