// src/shared/components/EmptyState.tsx
// T022 – EmptyState placeholder used by dashboard sections with no data (spec.md US4 AC5)

import React from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  style?: React.CSSProperties
  className?: string
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
  textAlign: 'center',
}

const iconContainerStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 'var(--radius-lg, 12px)',
  background: 'var(--color-surface, #1e293b)',
  border: '1px solid var(--color-border, #334155)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
}

// Simple empty-box SVG icon rendered inline (no dependencies needed)
const emptyIcon = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color-text-tertiary, #64748b)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--font-size-base, 0.875rem)',
  fontWeight: 600,
  color: 'var(--color-text-secondary, #94a3b8)',
  lineHeight: 1.5,
}

const descStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: 'var(--font-size-sm, 0.8125rem)',
  color: 'var(--color-text-tertiary, #64748b)',
  lineHeight: 1.5,
  maxWidth: 280,
}

/**
 * Displayed inside dashboard sections (Transcript, Claims, Reminders) when
 * the corresponding data array is empty after a call ends.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ title, description, style, className }) => (
  <div
    role="status"
    aria-label={title}
    className={className}
    style={{ ...containerStyle, ...style }}
  >
    <div style={iconContainerStyle} aria-hidden="true">
      {emptyIcon}
    </div>
    <p style={titleStyle}>{title}</p>
    {description != null && <p style={descStyle}>{description}</p>}
  </div>
)

export default EmptyState
