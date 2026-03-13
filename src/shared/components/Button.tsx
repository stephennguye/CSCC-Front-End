// src/shared/components/Button.tsx
// T020 – Accessible, typed Button primitive (plan.md §shared/components)
// WCAG 2.1 AA colour contrast maintained via CSS custom properties.

import React, { forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
    color: '#ffffff',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  },
  danger: {
    background: 'linear-gradient(135deg, var(--color-error) 0%, #dc2626 100%)',
    color: '#ffffff',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid transparent',
  },
  success: {
    background: 'linear-gradient(135deg, var(--color-success) 0%, #059669 100%)',
    color: '#ffffff',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
}

const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, var(--color-accent-hover) 0%, var(--color-accent-active) 100%)',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  secondary: {
    background: 'var(--color-surface-hover)',
    borderColor: 'var(--color-accent)',
  },
  danger: {
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  ghost: {
    background: 'var(--color-surface-hover)',
    color: 'var(--color-text-primary)',
  },
  success: {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: 'var(--font-size-xs)',
    borderRadius: 'var(--radius-sm)',
    gap: '4px',
  },
  md: {
    padding: '8px 16px',
    fontSize: 'var(--font-size-base)',
    borderRadius: 'var(--radius-md)',
    gap: '6px',
  },
  lg: {
    padding: '12px 24px',
    fontSize: 'var(--font-size-md)',
    borderRadius: 'var(--radius-md)',
    gap: '8px',
  },
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 600,
  lineHeight: 1.5,
  cursor: 'pointer',
  transition: 'all 200ms ease',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--font-family)',
  // NOTE: Do NOT set outline:none here — the global :focus-visible rule in
  // index.css provides the WCAG 2.1 AA focus ring for keyboard users.
}

const disabledStyle: React.CSSProperties = {
  opacity: 0.4,
  cursor: 'not-allowed',
  pointerEvents: 'none',
}

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '14px',
  height: '14px',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderTopColor: '#ffffff',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
  flexShrink: 0,
}

/**
 * Accessible button primitive used throughout the application.
 * Supports keyboard activation (Enter / Space) natively via <button>.
 * Forwards ref for imperative focus management.
 *
 * Variants: primary, secondary, danger, ghost, success
 * Sizes: sm, md, lg
 * Loading: shows a spinner and disables interaction
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      style,
      children,
      onKeyDown,
      onMouseEnter,
      onMouseLeave,
      ...rest
    },
    ref,
  ) => {
    const [hovered, setHovered] = React.useState(false)
    const isDisabled = disabled || loading

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
        e.preventDefault()
        e.currentTarget.click()
      }
      onKeyDown?.(e)
    }

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      setHovered(true)
      onMouseEnter?.(e)
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      setHovered(false)
      onMouseLeave?.(e)
    }

    return (
      <button
        ref={ref}
        role="button"
        disabled={isDisabled}
        aria-busy={loading || undefined}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          ...baseStyle,
          ...sizeStyles[size],
          ...variantStyles[variant],
          ...(hovered && !isDisabled ? hoverStyles[variant] : {}),
          ...(isDisabled ? disabledStyle : {}),
          ...style,
        }}
        {...rest}
      >
        {loading && <span style={spinnerStyle} aria-hidden="true" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
