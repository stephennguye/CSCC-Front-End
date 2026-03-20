// src/features/dashboard/DashboardScreen.tsx
// T046 – Post-call review dashboard (spec.md US4 ACs; plan.md §dashboard/)
// Composes: TranscriptSection, ClaimsSection, RemindersSection, ExportButton.
// Data is loaded via useDashboardData, stored in DashboardSlice.

import React from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../../store/store'
import { useDashboardData } from './hooks/useDashboardData'
import { TranscriptSection } from './TranscriptSection'
import { ClaimsSection } from '../claims/ClaimsSection'
import { RemindersSection } from '../reminders/RemindersSection'
import { ExportButton } from './ExportButton'

// ---------------------------------------------------------------------------
// Shared card style — reused by section wrappers
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  padding: '1.25rem 1.5rem',
}

// ---------------------------------------------------------------------------
// Loading skeleton — one reusable block
// ---------------------------------------------------------------------------

function SkeletonBlock({ height = '8rem' }: { height?: string }): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        borderRadius: 'var(--radius-card)',
        backgroundColor: 'var(--color-surface)',
        animation: 'shimmer 1.5s ease-in-out infinite',
        backgroundImage:
          'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-hover) 50%, var(--color-surface) 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Helper: format duration from epoch timestamps
// ---------------------------------------------------------------------------

function formatDuration(startedAt: number, endedAt: number | null): string {
  if (!endedAt) return 'In progress'
  const seconds = Math.round((endedAt - startedAt) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs.toString().padStart(2, '0')}s`
}

function formatOutcome(outcome: string): { label: string; color: string } {
  switch (outcome) {
    case 'normal_end':
      return { label: 'Completed', color: 'var(--color-success)' }
    case 'error':
      return { label: 'Error', color: 'var(--color-error)' }
    case 'abandoned':
      return { label: 'Abandoned', color: 'var(--color-warning)' }
    default:
      return { label: outcome, color: 'var(--color-text-muted)' }
  }
}

// ---------------------------------------------------------------------------
// DashboardScreen
// ---------------------------------------------------------------------------

/**
 * Full post-call review dashboard.
 *
 * Mount behaviour:
 * - `useDashboardData` fires `GET /api/sessions/:sessionId` on mount.
 * - While loading, skeleton blocks are shown.
 * - On error, a friendly message with a home link is shown.
 * - On success, all three content sections and the Export button render.
 */
export default function DashboardScreen(): React.ReactElement {
  // Populate DashboardSlice from the REST API
  useDashboardData()

  const sessionData = useAppStore((s) => s.dashboard.sessionData)
  const isLoading   = useAppStore((s) => s.dashboard.isLoading)
  const error       = useAppStore((s) => s.dashboard.error)

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        fontFamily: 'system-ui, sans-serif',
        color: 'var(--color-text)',
      }}
      aria-label="Post-call review dashboard"
    >
      <div
        style={{
          maxWidth: '52rem',
          margin: '0 auto',
          padding: '1.5rem 1rem 3rem',
        }}
      >
        {/* -- Top bar ---------------------------------------------------- */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2rem',
                height: '2rem',
                borderRadius: 'var(--radius-input)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                fontSize: '1rem',
                lineHeight: 1,
                transition: 'background-color 0.15s, color 0.15s',
              }}
              aria-label="Back to call screen"
            >
              &#8592;
            </Link>
            <h1
              style={{
                margin: 0,
                fontSize: '1.375rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                lineHeight: 1.3,
              }}
            >
              Call Review
            </h1>
          </div>

          {/* Export button — only shown when data is loaded */}
          {sessionData && (
            <ExportButton sessionData={sessionData} isLoading={isLoading} />
          )}
        </header>

        {/* -- Loading skeleton ------------------------------------------- */}
        {isLoading && (
          <div
            role="status"
            aria-label="Loading session data"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <SkeletonBlock height="5rem" />
            <SkeletonBlock height="10rem" />
            <SkeletonBlock height="6rem" />
            <SkeletonBlock height="6rem" />
          </div>
        )}

        {/* -- Error state ------------------------------------------------ */}
        {!isLoading && error && (
          <div
            role="alert"
            style={{
              ...cardStyle,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.9375rem',
            }}
          >
            <strong style={{ color: 'var(--color-error)' }}>Failed to load session.</strong>{' '}
            {error}{' '}
            <Link
              to="/"
              style={{
                color: 'var(--color-accent)',
                fontWeight: 600,
                textDecoration: 'underline',
                marginLeft: '0.25rem',
              }}
            >
              Start a new call
            </Link>
          </div>
        )}

        {/* -- Content sections ------------------------------------------- */}
        {!isLoading && !error && sessionData && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Session metadata card */}
            <div style={cardStyle}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  alignItems: 'center',
                }}
              >
                {/* Session ID */}
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      color: 'var(--color-text-muted)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Session ID
                  </span>
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'ui-monospace, monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {sessionData.session.id}
                  </span>
                </div>

                {/* Duration */}
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      color: 'var(--color-text-muted)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Duration
                  </span>
                  <span
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                    }}
                  >
                    {formatDuration(sessionData.session.startedAt, sessionData.session.endedAt)}
                  </span>
                </div>

                {/* Outcome */}
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      color: 'var(--color-text-muted)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Outcome
                  </span>
                  {(() => {
                    const { label, color } = formatOutcome(sessionData.session.outcome)
                    return (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color,
                          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                          padding: '0.125rem 0.625rem',
                          borderRadius: 'var(--radius-pill)',
                        }}
                      >
                        {label}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>

            <TranscriptSection transcript={sessionData.transcript} />
            <ClaimsSection claims={sessionData.claims} />
            <RemindersSection reminders={sessionData.reminders} />
          </div>
        )}
      </div>
    </main>
  )
}
