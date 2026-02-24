import React, { useCallback } from 'react'
import Button from '../../shared/components/Button'
import type { CallStatus } from '../../shared/types/call-state'

export interface CallControlsProps {
  status: CallStatus
  onStart: () => void
  onEnd: () => void
}

/**
 * Renders Start Call and End Call buttons.
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

  return (
    <div
      style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
      role="group"
      aria-label="Call controls"
    >
      <Button
        variant="primary"
        disabled={startDisabled}
        aria-label="Start call"
        onClick={onStart}
        onKeyDown={handleStartKeyDown}
      >
        Start Call
      </Button>

      <Button
        variant="danger"
        disabled={endDisabled}
        aria-label="End call"
        onClick={onEnd}
        onKeyDown={handleEndKeyDown}
      >
        End Call
      </Button>
    </div>
  )
}
