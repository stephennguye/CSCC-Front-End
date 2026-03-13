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
    <section
      aria-labelledby="claims-section-heading"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '1.25rem 1.5rem',
      }}
    >
      <h2
        id="claims-section-heading"
        style={{
          margin: '0 0 1rem',
          fontSize: '0.9375rem',
          fontWeight: 700,
          color: 'var(--color-text)',
          letterSpacing: '0.01em',
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
            gap: '0.625rem',
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
                  gap: '0.5rem',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-input)',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {/* Speaker + confidence row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                  }}
                >
                  <Badge variant={claim.speaker}>
                    {claim.speaker === 'user' ? 'You' : 'AI'}
                  </Badge>

                  {/* Confidence progress bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: '1 1 auto',
                    }}
                  >
                    <div
                      style={{
                        flex: '0 0 4rem',
                        height: '0.375rem',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: 'var(--color-border)',
                        overflow: 'hidden',
                      }}
                      role="progressbar"
                      aria-valuenow={confidencePct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Confidence: ${confidencePct}%`}
                    >
                      <div
                        style={{
                          width: `${confidencePct}%`,
                          height: '100%',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor:
                            confidencePct >= 80
                              ? 'var(--color-success)'
                              : confidencePct >= 50
                                ? 'var(--color-warning)'
                                : 'var(--color-error)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                        minWidth: '2.25rem',
                      }}
                      aria-label={`Confidence: ${confidencePct}%`}
                    >
                      {confidencePct}%
                    </span>
                  </div>
                </div>

                {/* Claim text — sanitised before insertion */}
                <p
                  /* eslint-disable-next-line react/no-danger */
                  dangerouslySetInnerHTML={{ __html: safeText }}
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: 'var(--color-text-secondary)',
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
