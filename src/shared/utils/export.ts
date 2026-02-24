// src/shared/utils/export.ts
// T012 – Post-call JSON export builder (spec.md FR-022)
// Produces a PostCallResponse-shaped payload ready for JSON.stringify and
// Blob download from the DashboardScreen.

import type { PostCallResponse } from '../types/call-session'

/**
 * Payload type returned by buildExportPayload.
 * Extends PostCallResponse with a client-generated exportedAt timestamp
 * (ISO 8601) as specified in data-model.md §Export Schema.
 */
export type ExportPayload = PostCallResponse & {
  exportedAt: string
}

/**
 * Build a JSON-serialisable export object from post-call session data.
 *
 * @param data - The PostCallResponse fetched from GET /api/sessions/{id}.
 * @returns An ExportPayload ready for `JSON.stringify` and Blob download.
 *
 * Usage (DashboardScreen / ExportButton):
 * ```ts
 * const payload = buildExportPayload(sessionData)
 * const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
 * ```
 */
export function buildExportPayload(data: PostCallResponse): ExportPayload {
  return {
    ...data,
    exportedAt: new Date().toISOString(),
  }
}
