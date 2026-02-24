// src/features/call/CallScreen.tsx
// T032 – Main call UI screen; composes state, controls, mic indicator
// Phase 4 (T038) will integrate TranscriptPanel into the placeholder slot.
// Source: plan.md §call/; spec.md US1

import React, { useCallback } from 'react'
import { useAppStore } from '../../store/store'
import { useCallSession } from './hooks/useCallSession'
import { CallStateIndicator } from './CallStateIndicator'
import { CallControls } from './CallControls'
import { MicStatusIndicator } from './MicStatusIndicator'
import { TranscriptPanel } from '../transcript/TranscriptPanel'

/**
 * CallScreen — the root screen rendered at `/`.
 *
 * Wires `useCallSession` and passes scalar selectors to child components.
 * No array-returning selectors here (spec: scalar selectors only in CallScreen).
 *
 * Placeholder slot for `<TranscriptPanel />` is provided but left empty
 * until Phase 4 (T038).
 */
export function CallScreen(): React.ReactElement {
  const status = useAppStore((s) => s.call.status)
  const { startCall, endCall } = useCallSession()

  const handleStart = useCallback(() => {
    void startCall()
  }, [startCall])

  return (
    <main
      aria-label="Voice call"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '2rem 1rem',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
        AI Voice Call
      </h1>

      {/* Call state pill */}
      <CallStateIndicator onRetry={handleStart} />

      {/* Start / End buttons */}
      <CallControls
        status={status}
        onStart={handleStart}
        onEnd={endCall}
      />

      {/* Microphone activity indicator */}
      <MicStatusIndicator />

      {/* ── TranscriptPanel (T038 – Phase 4) ──────────────────────────────── */}
      <TranscriptPanel />
    </main>
  )
}
