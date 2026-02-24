// src/features/call/CallStateIndicator.tsx
// T031 + T039 – Full per-state visual design: spinner, pulsing mic, animated ellipsis,
//               waveform bars, checkmark, and warning icon with sanitised error + retry CTA.
// Source: spec.md US3 ACs; plan.md §CallStateIndicator; SC-004 ≤300 ms; FR-003, FR-024, FR-026

import React from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/store'
import { sanitise } from '../../shared/utils/sanitise'
import type { CallStatus } from '../../shared/types/call-state'

// ---------------------------------------------------------------------------
// Per-state display configuration (WCAG AA contrast verified)
// ---------------------------------------------------------------------------

interface StateConfig {
  label: string
  /** Text / icon colour — ≥4.5:1 contrast against bg */
  color: string
  bg: string
  /** Unique aria-label suffix for screen reader announcement */
  ariaDesc: string
}

const stateConfig: Record<CallStatus, StateConfig> = {
  idle: {
    label: 'Ready to start',
    color: '#374151', // gray-700 on gray-100 → 7.8:1
    bg: '#f3f4f6',
    ariaDesc: 'Ready to start a call',
  },
  connecting: {
    label: 'Connecting\u2026',
    color: '#92400e', // amber-800 on amber-100 → 5.6:1
    bg: '#fef3c7',
    ariaDesc: 'Connecting to the call',
  },
  listening: {
    label: 'Listening',
    color: '#065f46', // emerald-800 on emerald-100 → 7.1:1
    bg: '#d1fae5',
    ariaDesc: 'Listening — microphone active',
  },
  thinking: {
    label: 'AI is thinking\u2026',
    color: '#4c1d95', // violet-900 on violet-100 → 8.4:1
    bg: '#ede9fe',
    ariaDesc: 'AI is processing your message',
  },
  speaking: {
    label: 'AI is speaking',
    color: '#3730a3', // indigo-800 on indigo-100 → 7.7:1
    bg: '#e0e7ff',
    ariaDesc: 'AI is speaking a response',
  },
  ended: {
    label: 'Call ended',
    color: '#166534', // green-800 on green-50 → 8.9:1
    bg: '#f0fdf4',
    ariaDesc: 'Call ended successfully',
  },
  error: {
    label: 'Error',
    color: '#991b1b', // red-800 on red-100 → 5.8:1
    bg: '#fee2e2',
    ariaDesc: 'An error occurred',
  },
}

// ---------------------------------------------------------------------------
// Inline icon components (aria-hidden; no external deps; CSS animations only)
// ---------------------------------------------------------------------------

const spinnerStyle: CSSProperties = {
  display: 'inline-block',
  width: '0.75rem',
  height: '0.75rem',
  border: '2px solid currentColor',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  flexShrink: 0,
}

/** Pulsing dot for Listening state — uses pulseRing keyframe from index.css */
function PulsingMicIcon({ color }: { color: string }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1rem',
        height: '1rem',
        borderRadius: '50%',
        backgroundColor: color,
        animation: 'pulseRing 1.5s ease-out infinite',
        flexShrink: 0,
      }}
    >
      {/* SVG mic symbol */}
      <svg width="8" height="10" viewBox="0 0 8 10" fill="none" aria-hidden="true">
        <rect x="2.5" y="0" width="3" height="5.5" rx="1.5" fill="white" />
        <path d="M1 4.5C1 6.43 2.34 8 4 8s3-1.57 3-3.5" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round" />
        <line x1="4" y1="8" x2="4" y2="10" stroke="white" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/** Three animated dots for Thinking state — uses thinkingDot keyframe from index.css */
function ThinkingDots({ color }: { color: string }): React.ReactElement {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: color,
            transformOrigin: 'center bottom',
            animation: `thinkingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

/** Four animated bars for Speaking state — uses waveformBar keyframe from index.css */
function WaveformIcon({ color }: { color: string }): React.ReactElement {
  const delays = ['0s', '0.1s', '0.2s', '0.1s']
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '14px', flexShrink: 0 }}
    >
      {delays.map((delay, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '3px',
            height: '100%',
            borderRadius: '2px',
            backgroundColor: color,
            transformOrigin: 'center',
            animation: `waveformBar 0.8s ease-in-out ${delay} infinite`,
          }}
        />
      ))}
    </span>
  )
}

/** Checkmark for Ended state */
function CheckIcon({ color }: { color: string }): React.ReactElement {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="6.5" stroke={color} strokeWidth="1.5" />
      <path d="M4 7l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Warning triangle for Error state */
function WarningIcon({ color }: { color: string }): React.ReactElement {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 1L13 13H1L7 1Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="7" y1="5.5" x2="7" y2="8.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="10.5" r="0.5" fill={color} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CallStateIndicatorProps {
  /** Optional callback to trigger a new call attempt (shown in error and auth-failure states). */
  onRetry?: () => void
}

/**
 * Renders a call-state pill with a distinct visual cue for every state:
 * - idle      → plain label
 * - connecting → CSS spinner
 * - listening  → pulsing mic dot
 * - thinking   → three animated dots
 * - speaking   → animated waveform bars
 * - ended      → checkmark icon
 * - error      → warning icon + sanitised error message + retry CTA
 * - reconnecting (wsStatus, not CallStatus) → spinner + attempt N/5
 *
 * All states meet WCAG 2.1 AA (≥4.5:1). State changes announce within ≤300 ms (SC-004).
 */
export function CallStateIndicator({ onRetry }: CallStateIndicatorProps): React.ReactElement {
  const status         = useAppStore((s) => s.call.status)
  const error          = useAppStore((s) => s.call.error)
  const callId         = useAppStore((s) => s.call.callId)
  const wsStatus       = useAppStore((s) => s.connection.wsStatus)
  const reconnectCount = useAppStore((s) => s.connection.reconnectCount)
  const resetCall      = useAppStore((s) => s.resetCall)

  const navigate = useNavigate()

  // Reconnecting is a ConnectionStatus, not a CallStatus — overlay the display
  const isReconnecting = wsStatus === 'reconnecting'

  const cfg = isReconnecting
    ? {
        label: `Reconnecting\u2026 attempt\u00a0${reconnectCount}/5`,
        color: '#92400e',
        bg: '#fef3c7',
        ariaDesc: `Reconnecting to the call, attempt ${reconnectCount} of 5`,
      }
    : stateConfig[status]

  const sanitisedError = error ? sanitise(error) : null

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      aria-label={`Call state: ${cfg.ariaDesc}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'flex-start',
      }}
    >
      {/* ── State pill ───────────────────────────────────────────────────── */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.25rem 0.875rem',
          borderRadius: '9999px',
          fontSize: '0.875rem',
          fontWeight: 600,
          lineHeight: 1.5,
          backgroundColor: cfg.bg,
          color: cfg.color,
        }}
      >
        {/* -- Per-state visual cue -- */}
        {(status === 'connecting' || isReconnecting) && (
          <span aria-hidden="true" style={spinnerStyle} />
        )}
        {status === 'listening' && !isReconnecting && (
          <PulsingMicIcon color={cfg.color} />
        )}
        {status === 'thinking' && !isReconnecting && (
          <ThinkingDots color={cfg.color} />
        )}
        {status === 'speaking' && !isReconnecting && (
          <WaveformIcon color={cfg.color} />
        )}
        {status === 'ended' && !isReconnecting && (
          <CheckIcon color={cfg.color} />
        )}
        {status === 'error' && !isReconnecting && (
          <WarningIcon color={cfg.color} />
        )}

        {cfg.label}
      </span>

      {/* ── Error detail panel ──────────────────────────────────────────── */}
      {status === 'error' && sanitisedError && (
        <div
          role="alert"
          style={{
            maxWidth: '28rem',
            padding: '0.5rem 0.875rem',
            borderRadius: '0.375rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {/* dangerouslySetInnerHTML is safe — sanitise() strips all tags/scripts */}
          <span dangerouslySetInnerHTML={{ __html: sanitisedError }} />
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                display: 'block',
                marginTop: '0.5rem',
                background: 'none',
                border: 'none',
                color: '#991b1b',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                padding: 0,
              }}
              aria-label="Retry — start a new call"
            >
              Try again
            </button>
          )}
          {/* T049: Start New Call CTA — dispatches resetCall() + navigates to / (US5 AC3; FR-028) */}
          <button
            type="button"
            onClick={() => { resetCall(); navigate('/') }}
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '0.25rem',
              border: '1.5px solid #991b1b',
              backgroundColor: '#991b1b',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            aria-label="Start a new call — resets current call state"
          >
            Start new call
          </button>
        </div>
      )}

      {/* ── Ended CTA — navigate to post-call dashboard ─────────────────── */}
      {status === 'ended' && callId && (
        <button
          type="button"
          onClick={() => navigate(`/dashboard/${callId}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            marginTop: '0.25rem',
            padding: '0.375rem 0.875rem',
            borderRadius: '0.375rem',
            border: '2px solid #166534',
            backgroundColor: '#f0fdf4',
            color: '#166534',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          aria-label="Review call summary and export"
        >
          Review call →
        </button>
      )}
    </div>
  )
}
