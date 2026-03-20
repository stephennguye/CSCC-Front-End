// src/shared/types/call-session.ts
// T008 – Domain entity interfaces and Zod schemas

import { z } from 'zod'

// ---------------------------------------------------------------------------
// ConnectionLogEntry
// ---------------------------------------------------------------------------

export interface ConnectionLogEntry {
  event: 'connected' | 'disconnected' | 'reconnecting' | 'failed'
  timestamp: number
  wsCloseCode?: number
  attempt?: number
}

// ---------------------------------------------------------------------------
// CallSession
// ---------------------------------------------------------------------------

export interface CallSession {
  /** UUID assigned by the backend at call start */
  id: string
  /** UTC epoch milliseconds — set when the WebSocket connection is established */
  startedAt: number
  /** UTC epoch milliseconds — set on call end; null while in progress */
  endedAt: number | null
  /** How the session concluded */
  outcome: 'normal_end' | 'error' | 'abandoned'
  /** WebSocket events log; used for observability */
  connectionLog: ConnectionLogEntry[]
}

// ---------------------------------------------------------------------------
// TranscriptEntry
// ---------------------------------------------------------------------------

export interface TranscriptEntry {
  /** Monotonically increasing position within the session */
  index: number
  /** Who produced this turn */
  speaker: 'user' | 'ai'
  /** Full text of the completed turn */
  text: string
  /** UTC epoch milliseconds when the turn was finalised */
  timestamp: number
}

// ---------------------------------------------------------------------------
// Claim
// ---------------------------------------------------------------------------

export interface Claim {
  /** Position within the session's claim list */
  index: number
  /** The extracted factual statement */
  text: string
  /** Speaker whose utterance the claim was drawn from */
  speaker: 'user' | 'ai'
  /** Probability score, 0.0–1.0 */
  confidence: number
  /** UTC epoch milliseconds when the claim was extracted */
  timestamp: number
}

// ---------------------------------------------------------------------------
// Reminder
// ---------------------------------------------------------------------------

export interface Reminder {
  index: number
  /** Human-readable reminder text */
  text: string
  /** ISO 8601 datetime string, or null if no specific time was identified */
  dueAt: string | null
}

// ---------------------------------------------------------------------------
// Zod schemas (mirrors contracts/rest-auth.md §TypeScript Contract)
// ---------------------------------------------------------------------------

export const TranscriptEntrySchema = z.object({
  index: z.number().int().nonnegative(),
  speaker: z.enum(['user', 'ai']),
  text: z.string(),
  timestamp: z.number(),
})

export const BookingSchema = z.object({
  status: z.enum(['in_progress', 'confirmed', 'completed']),
  turnCount: z.number().int().nonnegative(),
  lastIntent: z.string().nullable(),
  filledSlots: z.record(z.string()),
  missingSlots: z.array(z.string()),
  slotsFilled: z.number().int().nonnegative(),
  slotsTotal: z.number().int().nonnegative(),
})

const SessionSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  outcome: z.enum(['normal_end', 'error', 'abandoned']),
})

/** Matches GET /api/sessions/{sessionId} response shape */
export const PostCallResponseSchema = z.object({
  session: SessionSchema,
  transcript: z.array(TranscriptEntrySchema),
  booking: BookingSchema.optional().default({
    status: 'in_progress',
    turnCount: 0,
    lastIntent: null,
    filledSlots: {},
    missingSlots: [],
    slotsFilled: 0,
    slotsTotal: 0,
  }),
})

export type PostCallResponse = z.infer<typeof PostCallResponseSchema>
