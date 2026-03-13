// src/shared/components/Badge.tsx
// T021 – Speaker attribution and call-state badge primitive (plan.md §shared/components)
// WCAG 2.1 AA colour contrast maintained (≥4.5:1 for normal text on dark backgrounds).

import React from 'react'

export type BadgeVariant =
  | 'user'       // speaker: user transcript entries
  | 'ai'         // speaker: AI transcript entries
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'reconnecting'
  | 'ended'
  | 'error'
  | 'neutral'

export interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

// Dark-theme optimised: semi-transparent backgrounds with high-contrast text.
// All pairs meet WCAG 2.1 AA ≥4.5:1 against the badge background.
const variantMap: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  user:         { bg: 'rgba(59, 130, 246, 0.15)',  color: '#93bbfd', border: 'rgba(59, 130, 246, 0.25)' },
  ai:           { bg: 'rgba(16, 185, 129, 0.15)',  color: '#6ee7b7', border: 'rgba(16, 185, 129, 0.25)' },
  idle:         { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: 'rgba(100, 116, 139, 0.25)' },
  connecting:   { bg: 'rgba(245, 158, 11, 0.15)',  color: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
  listening:    { bg: 'rgba(16, 185, 129, 0.15)',  color: '#6ee7b7', border: 'rgba(16, 185, 129, 0.25)' },
  thinking:     { bg: 'rgba(139, 92, 246, 0.15)',  color: '#c4b5fd', border: 'rgba(139, 92, 246, 0.25)' },
  speaking:     { bg: 'rgba(99, 102, 241, 0.15)',  color: '#a5b4fc', border: 'rgba(99, 102, 241, 0.25)' },
  reconnecting: { bg: 'rgba(245, 158, 11, 0.15)',  color: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
  ended:        { bg: 'rgba(16, 185, 129, 0.1)',   color: '#6ee7b7', border: 'rgba(16, 185, 129, 0.2)' },
  error:        { bg: 'rgba(239, 68, 68, 0.15)',   color: '#fca5a5', border: 'rgba(239, 68, 68, 0.25)' },
  neutral:      { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: 'rgba(100, 116, 139, 0.25)' },
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 'var(--radius-pill, 9999px)',
  fontSize: 'var(--font-size-xs, 0.75rem)',
  fontWeight: 600,
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
  letterSpacing: '0.01em',
  borderWidth: '1px',
  borderStyle: 'solid',
  transition: 'all 150ms ease',
}

/**
 * Small inline badge used for speaker labels (User / AI) and call-state labels.
 * Semi-transparent backgrounds designed for dark surfaces.
 * Colour pairs are chosen to meet WCAG 2.1 AA 4.5:1 contrast ratio.
 */
const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, style, className }) => {
  const { bg, color, border } = variantMap[variant]
  return (
    <span
      className={className}
      style={{
        ...baseStyle,
        backgroundColor: bg,
        color,
        borderColor: border,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export default Badge
