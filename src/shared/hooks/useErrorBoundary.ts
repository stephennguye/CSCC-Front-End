// src/shared/hooks/useErrorBoundary.ts
// T023 – useErrorBoundary hook (plan.md §shared/hooks)
// Provides imperative error-boundary control for components that need to
// surface async / service errors into React's error boundary tree.

import { useState, useCallback } from 'react'

export interface UseErrorBoundaryReturn {
  /** The current error, if any */
  error: Error | null
  /** Call this to surface an error to the nearest React error boundary */
  throwError: (error: unknown) => void
  /** Reset the stored error (e.g., after user dismisses an error UI) */
  resetError: () => void
}

/**
 * Provides a stable way to throw errors from event handlers or async
 * callbacks into React's error boundary tree, which only catches errors
 * thrown during render/commit.
 *
 * Usage:
 * ```tsx
 * const { throwError } = useErrorBoundary()
 *
 * async function loadData() {
 *   try { await fetch('/api/data') }
 *   catch (e) { throwError(e) }
 * }
 * ```
 */
export function useErrorBoundary(): UseErrorBoundaryReturn {
  const [error, setError] = useState<Error | null>(null)

  // Re-throw during the next render so React propagates it to the nearest
  // error boundary.
  if (error !== null) {
    throw error
  }

  const throwError = useCallback((err: unknown) => {
    setError(err instanceof Error ? err : new Error(String(err)))
  }, [])

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  return { error, throwError, resetError }
}
