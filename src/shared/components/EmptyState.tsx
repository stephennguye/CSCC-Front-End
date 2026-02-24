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
  padding: '2.5rem 1.5rem',
  textAlign: 'center',
  color: '#6b7280', // gray-500 — meets AA at 14px+ against white background
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 600,
  color: '#374151', // gray-700
}

const descStyle: React.CSSProperties = {
  margin: '0.25rem 0 0',
  fontSize: '0.875rem',
  color: '#6b7280', // gray-500
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
    <p style={titleStyle}>{title}</p>
    {description != null && <p style={descStyle}>{description}</p>}
  </div>
)

export default EmptyState
