// src/shared/components/Badge.tsx
// T021 – Speaker attribution and call-state badge primitive (plan.md §shared/components)
// WCAG 2.1 AA colour contrast maintained (≥4.5:1 for normal text).

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

const variantMap: Record<BadgeVariant, { bg: string; color: string }> = {
  user:         { bg: '#dbeafe', color: '#1e40af' }, // blue-100 / blue-800  contrast ≥4.5
  ai:           { bg: '#d1fae5', color: '#065f46' }, // green-100 / green-800
  idle:         { bg: '#f3f4f6', color: '#374151' }, // gray-100 / gray-700
  connecting:   { bg: '#fef3c7', color: '#92400e' }, // amber-100 / amber-800
  listening:    { bg: '#d1fae5', color: '#065f46' },
  thinking:     { bg: '#ede9fe', color: '#4c1d95' }, // violet-100 / violet-900
  speaking:     { bg: '#e0e7ff', color: '#3730a3' }, // indigo-100 / indigo-800
  reconnecting: { bg: '#fef3c7', color: '#92400e' },
  ended:        { bg: '#f0fdf4', color: '#166534' }, // green-50 / green-800
  error:        { bg: '#fee2e2', color: '#991b1b' }, // red-100 / red-800
  neutral:      { bg: '#f3f4f6', color: '#374151' },
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.125rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
}

/**
 * Small inline badge used for speaker labels (User / AI) and call-state labels.
 * Colour pairs are chosen to meet WCAG 2.1 AA 4.5:1 contrast ratio.
 */
const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, style, className }) => {
  const { bg, color } = variantMap[variant]
  return (
    <span
      className={className}
      style={{
        ...baseStyle,
        backgroundColor: bg,
        color,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export default Badge
