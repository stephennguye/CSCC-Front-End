// src/features/call/CallStateIndicator.tsx
// T031 + T039 – Full per-state visual design with large circular indicator
// Source: spec.md US3 ACs; plan.md §CallStateIndicator; SC-004 ≤300 ms; FR-003, FR-024, FR-026

import React from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/store'
import { sanitise } from '../../shared/utils/sanitise'
import type { CallStatus } from '../../shared/types/call-state'

// ---------------------------------------------------------------------------
// Per-state display configuration (dark theme)
// ---------------------------------------------------------------------------

interface StateConfig {
  label: string
  color: string
  borderColor: string
  glowColor: string
  ariaDesc: string
  animation: string
}

const stateConfig: Record<CallStatus, StateConfig> = {
  idle: {
    label: 'Ready to start',
    color: 'var(--color-text-tertiary)',
    borderColor: 'var(--color-border)',
    glowColor: 'transparent',
    ariaDesc: 'Ready to start a call',
    animation: 'breathe 3s ease-in-out infinite',
  },
  connecting: {
    label: 'Connecting...',
    color: 'var(--color-warning)',
    borderColor: 'var(--color-warning)',
    glowColor: 'rgba(245, 158, 11, 0.2)',
    ariaDesc: 'Connecting to the call',
    animation: 'none',
  },
  listening: {
    label: 'Listening',
    color: 'var(--color-success)',
    borderColor: 'var(--color-success)',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    ariaDesc: 'Listening — microphone active',
    animation: 'pulseGreen 2s ease-out infinite',
  },
  thinking: {
    label: 'AI is thinking...',
    color: 'var(--color-info)',
    borderColor: 'var(--color-info)',
    glowColor: 'rgba(99, 102, 241, 0.15)',
    ariaDesc: 'AI is processing your message',
    animation: 'none',
  },
  speaking: {
    label: 'AI is speaking',
    color: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    ariaDesc: 'AI is speaking a response',
    animation: 'none',
  },
  ended: {
    label: 'Call ended',
    color: 'var(--color-success)',
    borderColor: 'var(--color-success)',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    ariaDesc: 'Call ended successfully',
    animation: 'successGlow 2s ease-in-out infinite',
  },
  error: {
    label: 'Error',
    color: 'var(--color-error)',
    borderColor: 'var(--color-error)',
    glowColor: 'rgba(239, 68, 68, 0.15)',
    ariaDesc: 'An error occurred',
    animation: 'errorPulse 2s ease-in-out infinite',
  },
}

// ---------------------------------------------------------------------------
// Inline icon/animation components
// ---------------------------------------------------------------------------

/** Mic icon for Listening state */
function MicIcon(): React.ReactElement {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-success)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="1" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  )
}

/** Rotating gradient ring for Connecting state */
function RotatingRing(): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: '-4px',
        borderRadius: '50%',
        border: '3px solid transparent',
        borderTopColor: 'var(--color-warning)',
        borderRightColor: 'rgba(245, 158, 11, 0.3)',
        animation: 'rotateBorder 1s linear infinite',
      }}
    />
  )
}

/** Orbital dots for Thinking state */
function OrbitalDots(): React.ReactElement {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '8px',
            height: '8px',
            marginTop: '-4px',
            marginLeft: '-4px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-info)',
            animation: `orbit 1.8s linear ${i * 0.6}s infinite`,
            opacity: 1 - i * 0.25,
          }}
        />
      ))}
    </>
  )
}

/** Waveform bars for Speaking state */
function WaveformBars(): React.ReactElement {
  const delays = ['0s', '0.15s', '0.3s', '0.15s', '0s']
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        height: '40px',
      }}
    >
      {delays.map((delay, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: '4px',
            height: '100%',
            borderRadius: '2px',
            backgroundColor: 'var(--color-accent)',
            transformOrigin: 'center',
            animation: `waveformLarge 0.8s ease-in-out ${delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}

/** Check icon for Ended state */
function CheckCircleIcon(): React.ReactElement {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-success)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

/** Warning icon for Error state */
function AlertIcon(): React.ReactElement {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-error)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/** Spinner icon for Connecting center */
function SpinnerIcon(): React.ReactElement {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-warning)"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

/** Idle headset icon */
function IdleIcon(): React.ReactElement {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-tertiary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

/** Ripple rings for Listening state */
function RippleRings(): React.ReactElement {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid var(--color-success)',
            animation: `ripple 2s ease-out ${i * 0.6}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
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
 * Renders a large circular call state indicator with distinct visuals per state:
 * - idle       → breathing animation, headset icon
 * - connecting → rotating gradient border, spinner
 * - listening  → pulsing green ring, ripple effect, mic icon
 * - thinking   → orbital dots animation
 * - speaking   → waveform bars inside
 * - ended      → check icon with success glow
 * - error      → alert icon with red pulse
 *
 * All states meet WCAG 2.1 AA. State changes announce within ≤300 ms (SC-004).
 */
export function CallStateIndicator({ onRetry }: CallStateIndicatorProps): React.ReactElement {
  const status         = useAppStore((s) => s.call.status)
  const error          = useAppStore((s) => s.call.error)
  const callId         = useAppStore((s) => s.call.callId)
  const wsStatus       = useAppStore((s) => s.connection.wsStatus)
  const reconnectCount = useAppStore((s) => s.connection.reconnectCount)
  const resetCall      = useAppStore((s) => s.resetCall)

  const navigate = useNavigate()

  const isReconnecting = wsStatus === 'reconnecting'

  const cfg = isReconnecting
    ? {
        label: `Reconnecting... attempt\u00a0${reconnectCount}/5`,
        color: 'var(--color-warning)',
        borderColor: 'var(--color-warning)',
        glowColor: 'rgba(245, 158, 11, 0.2)',
        ariaDesc: `Reconnecting to the call, attempt ${reconnectCount} of 5`,
        animation: 'none',
      }
    : stateConfig[status]

  const sanitisedError = error ? sanitise(error) : null

  // Determine inner content for the circle
  const renderInner = (): React.ReactElement | null => {
    if (isReconnecting || status === 'connecting') return <SpinnerIcon />
    switch (status) {
      case 'idle':      return <IdleIcon />
      case 'listening': return <MicIcon />
      case 'speaking':  return <WaveformBars />
      case 'ended':     return <CheckCircleIcon />
      case 'error':     return <AlertIcon />
      case 'thinking':  return null // orbital dots are outside the circle
      default:          return null
    }
  }

  const circleStyle: CSSProperties = {
    position: 'relative',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: `3px solid ${cfg.borderColor}`,
    backgroundColor: cfg.glowColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: cfg.animation,
    transition: 'border-color 0.3s ease, background-color 0.3s ease',
  }

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      aria-label={`Call state: ${cfg.ariaDesc}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-4)',
      }}
    >
      {/* ── Large circular indicator ──────────────────────────────────────── */}
      <div style={circleStyle}>
        {/* Connecting: rotating ring */}
        {(status === 'connecting' || isReconnecting) && <RotatingRing />}

        {/* Listening: ripple rings */}
        {status === 'listening' && !isReconnecting && <RippleRings />}

        {/* Thinking: orbital dots */}
        {status === 'thinking' && !isReconnecting && <OrbitalDots />}

        {/* Center icon/animation */}
        {renderInner()}
      </div>

      {/* ── Status text label ─────────────────────────────────────────────── */}
      <span
        style={{
          fontSize: 'var(--font-size-base)',
          fontWeight: 600,
          color: cfg.color,
          letterSpacing: '0.02em',
        }}
      >
        {cfg.label}
      </span>

      {/* ── Error detail panel ──────────────────────────────────────────── */}
      {status === 'error' && sanitisedError && (
        <div
          role="alert"
          style={{
            maxWidth: '28rem',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-error-subtle)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-error)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: sanitisedError }} />
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                display: 'block',
                marginTop: 'var(--space-2)',
                background: 'none',
                border: 'none',
                color: 'var(--color-error)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                padding: 0,
              }}
              aria-label="Retry — start a new call"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => { resetCall(); navigate('/') }}
            style={{
              display: 'inline-block',
              marginTop: 'var(--space-2)',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-error)',
              backgroundColor: 'var(--color-error)',
              color: '#ffffff',
              fontSize: 'var(--font-size-sm)',
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
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-success)',
            backgroundColor: 'var(--color-success-subtle)',
            color: 'var(--color-success)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          aria-label="Review call summary and export"
        >
          Review call
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  )
}
