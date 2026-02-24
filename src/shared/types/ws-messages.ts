// src/shared/types/ws-messages.ts
// T009 – Inbound WebSocket message Zod schemas + discriminated union
// Source: contracts/websocket-messages.md §Zod Schema

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Individual message schemas
// ---------------------------------------------------------------------------

export const CallStateMessageSchema = z.object({
  type: z.literal('call_state'),
  state: z.enum(['listening', 'thinking', 'speaking', 'ended', 'error']),
  /** Present only when state === 'error' */
  error: z.string().optional(),
  /** Present only when state === 'speaking'; raw PCM sample rate */
  sampleRate: z.union([z.literal(22050), z.literal(24000)]).optional(),
  timestamp: z.number(),
})

export const TranscriptTokenSchema = z.object({
  type: z.literal('transcript_token'),
  speaker: z.enum(['user', 'ai']),
  token: z.string(),
  timestamp: z.number(),
})

export const TranscriptCommitSchema = z.object({
  type: z.literal('transcript_commit'),
  speaker: z.enum(['user', 'ai']),
  /** The full, final text of the committed turn (authoritative over streamed tokens) */
  text: z.string(),
  timestamp: z.number(),
})

export const AudioStreamEndSchema = z.object({
  type: z.literal('audio_stream_end'),
})

export const ClaimMessageSchema = z.object({
  type: z.literal('claim'),
  text: z.string(),
  speaker: z.enum(['user', 'ai']),
  confidence: z.number().min(0).max(1),
  timestamp: z.number(),
})

export const ReminderMessageSchema = z.object({
  type: z.literal('reminder'),
  text: z.string(),
  dueAt: z.string().datetime().optional(),
  timestamp: z.number(),
})

export const BargeInAckSchema = z.object({
  type: z.literal('barge_in_ack'),
})

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
})

// ---------------------------------------------------------------------------
// Discriminated union – ALL inbound frames MUST validate through this schema
// before any processing (SC-008)
// ---------------------------------------------------------------------------

export const InboundMessageSchema = z.discriminatedUnion('type', [
  CallStateMessageSchema,
  TranscriptTokenSchema,
  TranscriptCommitSchema,
  AudioStreamEndSchema,
  ClaimMessageSchema,
  ReminderMessageSchema,
  BargeInAckSchema,
  ErrorMessageSchema,
])

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type InboundMessage   = z.infer<typeof InboundMessageSchema>
export type CallStateMessage = z.infer<typeof CallStateMessageSchema>
export type TranscriptToken  = z.infer<typeof TranscriptTokenSchema>
export type TranscriptCommit = z.infer<typeof TranscriptCommitSchema>
export type AudioStreamEnd   = z.infer<typeof AudioStreamEndSchema>
export type ClaimMessage     = z.infer<typeof ClaimMessageSchema>
export type ReminderMessage  = z.infer<typeof ReminderMessageSchema>
export type BargeInAck       = z.infer<typeof BargeInAckSchema>
export type ErrorMessage     = z.infer<typeof ErrorMessageSchema>
