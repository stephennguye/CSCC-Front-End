// src/features/call/CallScreen.tsx
// T032 – Main call UI screen; composes state, controls, mic indicator
// Phase 4 (T038) will integrate TranscriptPanel into the placeholder slot.
// Source: plan.md §call/; spec.md US1

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useAppStore } from '../../store/store'
import { useCallSession } from './hooks/useCallSession'
import { CallStateIndicator } from './CallStateIndicator'
import { CallControls } from './CallControls'
import { MicStatusIndicator } from './MicStatusIndicator'
import { TranscriptPanel } from '../transcript/TranscriptPanel'
import { PipelineVisualizer } from '../pipeline/PipelineVisualizer'

/**
 * Formats elapsed seconds into MM:SS display.
 */
function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * CallScreen — the root screen rendered at `/`.
 *
 * Wires `useCallSession` and passes scalar selectors to child components.
 * No array-returning selectors here (spec: scalar selectors only in CallScreen).
 */
export function CallScreen(): React.ReactElement {
  const status = useAppStore((s) => s.call.status)
  const startedAt = useAppStore((s) => s.call.startedAt)
  const wsStatus = useAppStore((s) => s.connection.wsStatus)
  const { startCall, endCall } = useCallSession()

  const handleStart = useCallback(() => {
    void startCall()
  }, [startCall])

  // ── Call Timer ──────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isActive = status === 'listening' || status === 'thinking' || status === 'speaking'

  useEffect(() => {
    if (isActive && startedAt) {
      // Initialize with current elapsed
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }, 1000)
    } else if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (status === 'idle') {
        setElapsed(0)
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isActive, startedAt, status])

  // ── Sidebar collapse state ─────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Connection status indicator
  const connectionColor =
    wsStatus === 'connected'
      ? 'var(--color-success)'
      : wsStatus === 'reconnecting'
        ? 'var(--color-warning)'
        : 'var(--color-text-tertiary)'

  const connectionLabel =
    wsStatus === 'connected'
      ? 'Connected'
      : wsStatus === 'reconnecting'
        ? 'Reconnecting'
        : 'Disconnected'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Navigation Bar ──────────────────────────────────────────── */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-6)',
          height: '56px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        {/* Left: App title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Headset icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <span
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Vietnamese AI Call Center
          </span>
        </div>

        {/* Right: Connection status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connectionColor,
              boxShadow: wsStatus === 'connected' ? `0 0 6px ${connectionColor}` : 'none',
            }}
          />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {connectionLabel}
          </span>
        </div>
      </nav>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* ── Left Sidebar: Pipeline Visualizer ─────────────────────────── */}
        <aside
          style={{
            width: sidebarOpen ? '280px' : '0px',
            flexShrink: 0,
            borderRight: sidebarOpen ? '1px solid var(--color-border)' : 'none',
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: 'var(--color-surface)',
            transition: 'width 0.3s ease',
            position: 'relative',
          }}
          aria-label="Pipeline visualizer sidebar"
        >
          {sidebarOpen && (
            <div style={{ padding: 'var(--space-4)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Pipeline
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Collapse pipeline sidebar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-tertiary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ‹
                </button>
              </div>
              <PipelineVisualizer />
            </div>
          )}
        </aside>

        {/* Sidebar toggle when collapsed */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Expand pipeline sidebar"
            style={{
              position: 'absolute',
              left: 0,
              top: '72px',
              zIndex: 10,
              width: '24px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: '1px solid var(--color-border)',
              borderLeft: 'none',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ›
          </button>
        )}

        {/* ── Center: Main Call Area ─────────────────────────────────────── */}
        <main
          aria-label="Voice call"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Call state + controls area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-5)',
              paddingTop: 'var(--space-10)',
              paddingBottom: 'var(--space-6)',
              flexShrink: 0,
            }}
          >
            {/* Large animated call state indicator */}
            <CallStateIndicator onRetry={handleStart} />

            {/* Call duration timer */}
            {(isActive || status === 'ended') && (
              <div
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  letterSpacing: '0.05em',
                }}
                aria-label={`Call duration: ${formatTimer(elapsed)}`}
                aria-live="off"
              >
                {formatTimer(elapsed)}
              </div>
            )}

            {/* Call controls */}
            <CallControls
              status={status}
              onStart={handleStart}
              onEnd={endCall}
            />
          </div>

          {/* Transcript panel — takes remaining height */}
          <div
            style={{
              flex: 1,
              width: '100%',
              overflow: 'hidden',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <TranscriptPanel />
          </div>

          {/* Footer: Mic status */}
          <div
            style={{
              flexShrink: 0,
              padding: 'var(--space-2) var(--space-4)',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <MicStatusIndicator />
          </div>
        </main>
      </div>
    </div>
  )
}
