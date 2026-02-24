// src/shared/components/Button.tsx
// T020 – Accessible, typed Button primitive (plan.md §shared/components)
// WCAG 2.1 AA colour contrast maintained via CSS custom properties.

import React, { forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: '#1a56db',
    color: '#ffffff',
    border: '2px solid #1a56db',
  },
  secondary: {
    backgroundColor: '#ffffff',
    color: '#1a56db',
    border: '2px solid #1a56db',
  },
  danger: {
    backgroundColor: '#c81e1e',
    color: '#ffffff',
    border: '2px solid #c81e1e',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#374151',
    border: '2px solid transparent',
  },
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.5rem 1.25rem',
  borderRadius: '0.375rem',
  fontSize: '0.9375rem',
  fontWeight: 600,
  lineHeight: 1.5,
  cursor: 'pointer',
  transition: 'opacity 0.15s ease, background-color 0.15s ease',
  userSelect: 'none',
  // NOTE: Do NOT set outline:none here — the global button:focus-visible rule in
  // index.css provides the WCAG 2.1 AA focus ring for keyboard users (FR-023, SC-007).
}

const disabledStyle: React.CSSProperties = {
  opacity: 0.45,
  cursor: 'not-allowed',
  pointerEvents: 'none',
}

/**
 * Accessible button primitive used throughout the application.
 * Supports keyboard activation (Enter / Space) natively via <button>.
 * Forwards ref for imperative focus management.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', disabled, style, children, onKeyDown, ...rest }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault()
        e.currentTarget.click()
      }
      onKeyDown?.(e)
    }

    return (
      <button
        ref={ref}
        role="button"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        style={{
          ...baseStyle,
          ...variantStyles[variant],
          ...(disabled ? disabledStyle : {}),
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
