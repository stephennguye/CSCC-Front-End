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
// Loading skeleton — one reusable block
// ---------------------------------------------------------------------------

function SkeletonBlock({ height = '8rem' }: { height?: string }): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        borderRadius: '0.375rem',
        backgroundColor: '#e5e7eb',
        animation: 'shimmer 1.5s ease-in-out infinite',
        backgroundImage:
          'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  )
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
export function DashboardScreen(): React.ReactElement {
  // Populate DashboardSlice from the REST API
  useDashboardData()

  const sessionData = useAppStore((s) => s.dashboard.sessionData)
  const isLoading   = useAppStore((s) => s.dashboard.isLoading)
  const error       = useAppStore((s) => s.dashboard.error)

  return (
    <main
      style={{
        maxWidth: '52rem',
        margin: '0 auto',
        padding: '1.5rem 1rem',
        fontFamily: 'system-ui, sans-serif',
      }}
      aria-label="Post-call review dashboard"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
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
        <div>
          <Link
            to="/"
            style={{
              fontSize: '0.875rem',
              color: '#1a56db',
              textDecoration: 'none',
              fontWeight: 500,
            }}
            aria-label="Back to call screen"
          >
            ← Back to call
          </Link>
          <h1
            style={{
              margin: '0.25rem 0 0',
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#111827',
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

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {isLoading && (
        <div
          role="status"
          aria-label="Loading session data"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <SkeletonBlock height="10rem" />
          <SkeletonBlock height="6rem" />
          <SkeletonBlock height="6rem" />
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {!isLoading && error && (
        <div
          role="alert"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '0.5rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.9375rem',
          }}
        >
          <strong>Failed to load session.</strong>{' '}
          {error}{' '}
          <Link
            to="/"
            style={{
              color: '#991b1b',
              fontWeight: 600,
              textDecoration: 'underline',
              marginLeft: '0.25rem',
            }}
          >
            Start a new call
          </Link>
        </div>
      )}

      {/* ── Content sections ─────────────────────────────────────────────── */}
      {!isLoading && !error && sessionData && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          <TranscriptSection transcript={sessionData.transcript} />
          <ClaimsSection claims={sessionData.claims} />
          <RemindersSection reminders={sessionData.reminders} />
        </div>
      )}
    </main>
  )
}
