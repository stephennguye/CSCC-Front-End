// src/features/call/MicStatusIndicator.tsx
// T030 – Mic active/inactive indicator with aria-live="polite"
// Source: spec.md FR-004; plan.md §call/

import React from 'react'
import { useAppStore } from '../../store/store'

/**
 * Displays a small, elegant mic status indicator.
 * Subscribes to vadActive with a scalar selector (no re-render on other state changes).
 * Announces changes via aria-live="polite" (FR-004).
 */
export function MicStatusIndicator(): React.ReactElement {
  const vadActive = useAppStore((s) => s.audio.vadActive)

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        color: vadActive ? 'var(--color-success)' : 'var(--color-text-tertiary)',
        fontWeight: 500,
        fontSize: 'var(--font-size-xs)',
        letterSpacing: '0.02em',
        transition: 'color 0.2s ease',
      }}
      aria-label={vadActive ? 'Microphone is active — voice detected' : 'Microphone is standby'}
    >
      {/* Animated dot */}
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: vadActive ? 'var(--color-success)' : 'var(--color-border)',
          boxShadow: vadActive ? '0 0 6px rgba(16, 185, 129, 0.5)' : 'none',
          animation: vadActive ? 'micDotPulse 1.5s ease-in-out infinite' : 'none',
          transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
          flexShrink: 0,
        }}
      />
      {vadActive ? 'Mic active' : 'Mic standby'}
    </span>
  )
}
