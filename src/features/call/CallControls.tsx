// src/features/call/CallControls.tsx
// T029 – Call control buttons: start (green) and end (red) circular buttons
// Source: spec.md US1; plan.md §call/

import React, { useCallback } from 'react'
import type { CallStatus } from '../../shared/types/call-state'

export interface CallControlsProps {
  status: CallStatus
  onStart: () => void
  onEnd: () => void
}

/**
 * Renders Start Call and End Call as large circular buttons with phone icons.
 *
 * - Start disabled when call is in progress (not idle/ended/error).
 * - End disabled when there is no active call (idle/ended).
 * - Both buttons are keyboard-accessible via Tab + Enter/Space.
 */
export function CallControls({ status, onStart, onEnd }: CallControlsProps): React.ReactElement {
  const startDisabled = status !== 'idle' && status !== 'ended' && status !== 'error'
  const endDisabled   = status === 'idle' || status === 'ended'

  const handleStartKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !startDisabled) {
        e.preventDefault()
        onStart()
      }
    },
    [onStart, startDisabled],
  )

  const handleEndKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !endDisabled) {
        e.preventDefault()
        onEnd()
      }
    },
    [onEnd, endDisabled],
  )

  const btnSize = 64
  const iconSize = 24

  const baseBtnStyle: React.CSSProperties = {
    width: `${btnSize}px`,
    height: `${btnSize}px`,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s ease',
    padding: 0,
  }

  return (
    <div
      style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }}
      role="group"
      aria-label="Call controls"
    >
      {/* Start Call Button */}
      <button
        type="button"
        disabled={startDisabled}
        aria-label="Start call"
        onClick={onStart}
        onKeyDown={handleStartKeyDown}
        style={{
          ...baseBtnStyle,
          background: startDisabled
            ? 'var(--color-border)'
            : 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          boxShadow: startDisabled
            ? 'none'
            : '0 4px 16px rgba(16, 185, 129, 0.4)',
          opacity: startDisabled ? 0.4 : 1,
          cursor: startDisabled ? 'not-allowed' : 'pointer',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          if (!startDisabled) {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.5)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          if (!startDisabled) {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.4)'
          }
        }}
        onMouseDown={(e) => {
          if (!startDisabled) {
            e.currentTarget.style.transform = 'scale(0.95)'
          }
        }}
        onMouseUp={(e) => {
          if (!startDisabled) {
            e.currentTarget.style.transform = 'scale(1.08)'
          }
        }}
      >
        {/* Phone icon (pick up) */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>

      {/* End Call Button */}
      <button
        type="button"
        disabled={endDisabled}
        aria-label="End call"
        onClick={onEnd}
        onKeyDown={handleEndKeyDown}
        style={{
          ...baseBtnStyle,
          background: endDisabled
            ? 'var(--color-border)'
            : 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: '#ffffff',
          boxShadow: endDisabled
            ? 'none'
            : '0 4px 16px rgba(239, 68, 68, 0.4)',
          opacity: endDisabled ? 0.4 : 1,
          cursor: endDisabled ? 'not-allowed' : 'pointer',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          if (!endDisabled) {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(239, 68, 68, 0.5)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          if (!endDisabled) {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.4)'
          }
        }}
        onMouseDown={(e) => {
          if (!endDisabled) {
            e.currentTarget.style.transform = 'scale(0.95)'
          }
        }}
        onMouseUp={(e) => {
          if (!endDisabled) {
            e.currentTarget.style.transform = 'scale(1.08)'
          }
        }}
      >
        {/* Hang up icon (rotated phone) */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ transform: 'rotate(135deg)' }}
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>
    </div>
  )
}
