// src/features/dashboard/hooks/useDashboardData.ts
// T045 – Fetches post-call session data and populates DashboardSlice
// Source: contracts/rest-auth.md §Get Post-Call Session Data; SC-006 ≤3 s

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '../../../store/store'
import { PostCallResponseSchema } from '../../../shared/types/call-session'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * On mount, fetches `GET /api/sessions/{sessionId}` using the sessionId from
 * React Router route params, validates the response via Zod, and dispatches
 * the result into DashboardSlice.
 *
 * Loading and error states are managed through the same slice.
 * SC-006: response must arrive within 3 s (no client-side timeout enforced here;
 * relies on the browser's default fetch timeout).
 */
export function useDashboardData(): void {
  const { sessionId } = useParams<{ sessionId: string }>()

  const setLoading     = useAppStore((s) => s.setLoading)
  const setSessionData = useAppStore((s) => s.setSessionData)
  const setDashboardError = useAppStore((s) => s.setDashboardError)

  useEffect(() => {
    if (!sessionId) {
      setDashboardError('No session ID provided in URL.')
      return
    }

    const controller = new AbortController()

    async function fetchSession() {
      setLoading(true)
      setDashboardError(null)
      setSessionData(null)

      try {
        const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
          throw new Error(`Failed to load session (HTTP ${response.status})`)
        }

        const raw: unknown = await response.json()
        const result = PostCallResponseSchema.safeParse(raw)

        if (!result.success) {
          throw new Error(
            `Unexpected session data format: ${result.error.issues[0]?.message ?? 'unknown error'}`,
          )
        }

        setSessionData(result.data)
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return
        setDashboardError(
          err instanceof Error ? err.message : 'An unexpected error occurred while loading the session.',
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchSession()

    return () => {
      controller.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])
}
