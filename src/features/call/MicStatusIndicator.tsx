// src/features/call/MicStatusIndicator.tsx
// T030 – Mic active/inactive indicator with aria-live="polite"
// Source: spec.md FR-004; plan.md §call/

import React from 'react'
import { useAppStore } from '../../store/store'

const activeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  color: '#065f46',
  fontWeight: 600,
  fontSize: '0.875rem',
}

const inactiveStyle: React.CSSProperties = {
  ...activeStyle,
  color: '#6b7280',
  fontWeight: 400,
}

const dotBase: React.CSSProperties = {
  width: '0.625rem',
  height: '0.625rem',
  borderRadius: '50%',
}

/**
 * Displays a mic-active or mic-inactive status indicator.
 * Subscribes to vadActive with a scalar selector (no re-render on other state changes).
 * Announces changes via aria-live="polite" (FR-004).
 */
export function MicStatusIndicator(): React.ReactElement {
  const vadActive = useAppStore((s) => s.audio.vadActive)

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      style={vadActive ? activeStyle : inactiveStyle}
      aria-label={vadActive ? 'Microphone is active — voice detected' : 'Microphone is standby'}
    >
      <span
        style={{
          ...dotBase,
          backgroundColor: vadActive ? '#10b981' : '#d1d5db',
          boxShadow: vadActive ? '0 0 0 2px #a7f3d0' : 'none',
          animation: vadActive ? 'pulseRing 1.2s ease-out infinite' : 'none',
        }}
      />
      {vadActive ? 'Mic active' : 'Mic standby'}
    </span>
  )
}
