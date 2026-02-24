// src/features/claims/ClaimsSection.tsx
// T042 – Claims section for the post-call dashboard (spec.md US4 AC2, AC5)
// Renders the claims array from PostCallResponse.
// Each row shows sanitised text, speaker badge, and confidence as a percentage.

import React from 'react'
import Badge from '../../shared/components/Badge'
import EmptyState from '../../shared/components/EmptyState'
import { sanitise } from '../../shared/utils/sanitise'
import type { Claim } from '../../shared/types/call-session'

export interface ClaimsSectionProps {
  claims: Claim[]
}

/**
 * Renders post-call extracted claims.
 * - `claim.text` is sanitised with DOMPurify before DOM insertion (Principle VII).
 * - `claim.confidence` is displayed as a percentage rounded to the nearest integer.
 * - Shows `<EmptyState>` when no claims were extracted.
 */
export function ClaimsSection({ claims }: ClaimsSectionProps): React.ReactElement {
  return (
    <section aria-labelledby="claims-section-heading">
      <h2
        id="claims-section-heading"
        style={{
          margin: '0 0 0.75rem',
          fontSize: '1rem',
          fontWeight: 700,
          color: '#111827',
        }}
      >
        Extracted Claims
      </h2>

      {claims.length === 0 ? (
        <EmptyState
          title="No claims extracted"
          description="No factual claims were identified during this call."
        />
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
          aria-label="Extracted claims"
        >
          {claims.map((claim) => {
            const safeText = sanitise(claim.text)
            const confidencePct = Math.round(claim.confidence * 100)

            return (
              <li
                key={claim.index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.375rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                }}
              >
                {/* Speaker + confidence row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Badge variant={claim.speaker}>
                    {claim.speaker === 'user' ? 'You' : 'AI'}
                  </Badge>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      fontWeight: 500,
                    }}
                    aria-label={`Confidence: ${confidencePct}%`}
                  >
                    {confidencePct}% confidence
                  </span>
                </div>

                {/* Claim text — sanitised before insertion */}
                <p
                  /* eslint-disable-next-line react/no-danger */
                  dangerouslySetInnerHTML={{ __html: safeText }}
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    color: '#111827',
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
